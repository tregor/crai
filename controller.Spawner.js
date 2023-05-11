const creepRoles = require("./roles");
const utils = require("./utils");
const config = require("./config");
const {addStat} = require("./utils");

const spawnerController = {
    run: function () {
        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            const room = spawn.room;
            const myCreeps = room.find(FIND_MY_CREEPS);
            const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
            let tier = room.controller.level;
            let energyAvailable = room.energyAvailable;
            let energyQueued = _.sum(spawn.memory.spawnQueue, (creep) => energyReqForCreep(creep.role, creep.tier));

            let roleCounts = {};
            for (const roleName in creepRoles){
                if (!roleCounts[roleName]) {
                    roleCounts[roleName] = 0;
                }
            }
            for (const name in myCreeps) {
                const creep = myCreeps[name];
                if (!roleCounts[creep.memory.role]) {
                    roleCounts[creep.memory.role] = 1;
                } else {
                    roleCounts[creep.memory.role]++;
                }
            }
            spawn.memory.debugFull = roleCounts;


            if (room.energyCapacityAvailable < config.energyPerTiers[tier]) {
//                console.log(`Downgrade T${tier}=>T${tier - 1}`)
                tier = tier - 1;
            }

            let creepRolesAvailable = {};
            let minEnergyReq = Infinity;
            let maxEnergyReq = -Infinity;
            for (const roleName in creepRoles) {
                let energyReq = energyReqForCreep(roleName, tier);
                if (room.energyCapacityAvailable >= energyReq) {
                    creepRolesAvailable[roleName] = creepRoles[roleName];
                    if (energyReq < minEnergyReq) {
                        minEnergyReq = energyReq;
                    }
                    if (energyReq > maxEnergyReq) {
                        maxEnergyReq = energyReq;
                    }
                }
            }
//             console.log(Object.keys(creepRoles), Object.keys(creepRolesAvailable));


            // Создаем очередь спавна, если ее еще нет
            if (!spawn.memory.spawnQueue) {
                spawn.memory.spawnQueue = [];
            }
            if (!spawn.memory.debugFull) {
                spawn.memory.debugFull = {};
            }

            // Если спавн не занят, берем первого крипа из очереди и спавним его
            if (!spawn.spawning && spawn.memory.spawnQueue.length > 0) {
                const nextCreep = spawn.memory.spawnQueue[0];
                const role = creepRoles[nextCreep.role];
                const energyRequired = energyReqForCreep(nextCreep.role, nextCreep.tier)
                if (energyAvailable >= energyRequired) {
                    spawn.memory.spawnQueue.shift();
                    spawnRole(spawn, role, nextCreep.tier);
                    energyAvailable = energyAvailable - energyRequired;
                }
            }

            // Display debug information using RoomVisuals
            const cpuUsage = Game.cpu.getUsed();
            const controllerEnergyPerTick = utils.getAvgStat(`rooms.${room.name}.energyDeliveredToController`);
            const controllerRemainProgress = (room.controller.progressTotal - room.controller.progress) / controllerEnergyPerTick;
            const controllerRemainSeconds = controllerRemainProgress * 5;
//            console.log(controllerEnergyPerTick, room.controller.progressTotal, room.controller.progress, controllerRemainProgress)
            utils.createDebugVisual(room.name, spawn.pos.x, spawn.pos.y,
                                    ` GCL${Game.gcl.level} ${Math.round(Game.gcl.progress / Game.gcl.progressTotal * 100)}%, RCL${tier} ${Math.round(room.controller.progress / room.controller.progressTotal * 100)}% (~${utils.formatETA(controllerRemainSeconds)})`,
                                    ` NRG: ${energyAvailable}/${room.energyCapacityAvailable} +${energyQueued}`,
                                    ` CPU: ${Math.ceil(cpuUsage/20*100)}% (${cpuUsage.toFixed(2)})`,
                                    ` BOTs: ${myCreeps.length}`,
            );
            if (spawn.memory.debugFull) {
                utils.createDebugVisual(room.name, spawn.pos.x, spawn.pos.y + 1,
                    JSON.stringify(spawn.memory.debugFull),
                );
            }

            //""" Главная логика спавнов и добавления в очереди

            // Добавляем рабочего на 1 место очереди спавна если у нас нет рабочих
            if (roleCounts['worker'] === 0 && energyAvailable >= 200 && room.energyCapacityAvailable <= 300 && energyQueued === 0) {
                spawn.memory.spawnQueue.unshift({role: 'worker', tier: 1});
                continue;
            }
            // Не делать ничего если энергии недостаточно для спавна
            if (energyAvailable - energyQueued < maxEnergyReq) {
                continue;
            }

            // Get total number of required creeps for each role
            for (const roleName in creepRolesAvailable) {
                const role = creepRoles[roleName];
                const existingCount = roleCounts[roleName] || 0;
                const successRate = Math.max(role.getSuccessRate(spawn.room) || 0, 0.1);
                const roleWeight = role.weight || 1; // Default weight is 1
                // let desiredCount = Math.min(Math.max(calculateRequiredCreeps(existingCount, successRate) * roleWeight, 1), config.creepsPerTier[tier - 1]);
                let desiredCount = Math.min(Math.ceil(Math.max(existingCount, 0.01) / successRate), tier);
                let energyRequired = energyReqForCreep(roleName, tier);
                let roleTier = Math.min(Math.ceil(tier * energyAvailable / energyRequired), tier);
//                spawn.memory.debugFull.push(`${role.name} e:${existingCount} s:${successRate} d:${desiredCount} n:${energyRequired}`);

                let alreadyQueued = _.sum(spawn.memory.spawnQueue, {filter: (creep) => creep.role === roleName && creep.tier === roleTier});
                const spawnCount = desiredCount - existingCount - alreadyQueued;
//                console.log(roleName,successRate, spawnCount, energyAvailable, energyQueued, energyRequired)
                for (let i = 0; i < spawnCount; i++) {
                    if (energyAvailable - energyQueued >= energyRequired) {
                        addToSpawnQueue(spawn, role.roleName, roleTier, 1);
                        energyAvailable = energyAvailable - energyRequired;
                        energyQueued = energyQueued + energyRequired;
                    }
                }
            }
        }
    },
};

function addToSpawnQueue(spawn, roleName, tier, count) {
    console.log(`Queing to spawn ${count}x T${tier}${roleName}`)
    for (let i = 0; i < count; i++) {;
        spawn.memory.spawnQueue.push({role: roleName, tier: tier});
    }
    utils.addStat(`rooms.${spawn.room.name}.creepsSpawned`, count)
}

function calculateRequiredCreeps(existingCount, efficiency) {
    if (efficiency <= 0) {
        return 0;
    }

    return Math.ceil(existingCount / (efficiency));
}

function energyReqForCreep(roleName, tier = 1) {
    const role = creepRoles[roleName];
    const body = role.getBody(tier);
    let cost = 0;

    for (let i = 0; i < body.length; i++) {
        cost += BODYPART_COST[body[i]];
    }
    return cost;
}


function spawnRole(spawn, role, tier) {
    if (spawn.spawning) {
        return ERR_BUSY;
    }

    const body = role.getBody(tier);
    const creepName = 'T' + tier + (role.roleName.charAt(0).toUpperCase() + role.roleName.slice(1)) + '_' + Game.time;
    const memory = {...role.memory, role: role.roleName, tier: tier};
    const cost = energyReqForCreep(role.roleName, tier);
    const result = spawn.spawnCreep(body, creepName, {memory: memory});

    if (result === OK) {
        console.log(`Spawning ${creepName} in room ${spawn.room.name} for ${cost}NRG`);
    } else {
        console.log(`The cost of a ${role.roleName} of Tier ${tier} is ${cost}NRG while ${spawn.room.energyAvailable} available.` + result);
    }
    return result;
}

module.exports = spawnerController;
