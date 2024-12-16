const config = require('../config');
const utils = require("../utils");
const creepRoles = require('../roles');
const energyReqForCreep = utils.energyReqForCreep;

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

            // Создаем очередь спавна, если ее еще нет
            if (!spawn.memory.spawnQueue) {
                spawn.memory.spawnQueue = [];
            }
            if (!spawn.memory.debugFull) {
                spawn.memory.debugFull = {};
            }



            spawn.memory.debugFull = {
                "role_counts": {},
                "spawn_queue": {},
                "energy": {
                    "available": room.energyCapacityAvailable,
                    "cost_min": 0,
                    "cost_max": 0,
                },
            };

            let roleCounts = {};
            let roleQueue = {};
            for (const roleName in creepRoles) {
                if (!roleCounts[roleName]) {
                    roleCounts[roleName] = 0;
                    roleQueue[roleName] = 0;
                }
            }
            for (const name in myCreeps) {
                const creep = myCreeps[name];
                roleCounts[creep.memory.role]++;
            }
            for (const init_creep in spawn.memory.spawnQueue) {
                roleQueue[spawn.memory.spawnQueue[init_creep]['role']]++;
            }
            spawn.memory.debugFull.role_counts = roleCounts;
            spawn.memory.debugFull.spawn_queue = roleQueue;


            if (room.energyCapacityAvailable < config.energyPerTiers[tier]) {
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
            spawn.memory.debugFull.energy.cost_min = minEnergyReq;
            spawn.memory.debugFull.energy.cost_max = maxEnergyReq;

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
            utils.createDebugVisual(room.name, spawn.pos.x, spawn.pos.y, `Tick#${Game.time}`,`GCL${Game.gcl.level} ${Math.round(Game.gcl.progress / Game.gcl.progressTotal * 100)}%, RCL${tier} ${Math.round(room.controller.progress / room.controller.progressTotal * 100)}% (~${utils.formatETA(controllerRemainSeconds)})`, ` NRG: ${energyAvailable}/${room.energyCapacityAvailable} +${energyQueued}`, ` CPU: ${Math.ceil(cpuUsage / 20 * 100)}% (${cpuUsage.toFixed(2)})`, ` BOTs: ${myCreeps.length}`, ` ${JSON.stringify(roleCounts)}`,);


            //""" Главная логика спавнов и добавления в очереди

            // Добавляем защитника на 1 место очереди спавна если есть угроза
            if (hostileCreeps.length > roleCounts['defender'] === 0 && roleQueue['defender']) {
                while (energyAvailable < energyReqForCreep('defender', tier)) {
                    tier -= 1;
                }
                spawn.memory.spawnQueue.unshift({role: 'defender', tier: tier});
                return;
            }

            // Добавляем рабочего на 1 место очереди спавна если у нас нет рабочих
            if (roleCounts['worker'] === 0 && roleQueue['worker'] === 0) {
                while (energyAvailable < energyReqForCreep('worker', tier)) {
                    tier -= 1;
                }
                spawn.memory.spawnQueue.unshift({role: 'worker', tier: tier}); //Unshift to set of 1st place
                return;
            }

            // Get total number of required creeps for each role
            for (const roleName in creepRolesAvailable) {
                try {
                    const role = creepRoles[roleName];
                    const existingCount = roleCounts[roleName] || 0;
                    let successRate = role.getSuccessRate(spawn.room);
                    if (isNaN(successRate)){
                        successRate = 1;
                    }
                    let desiredCount = 1;
                    if (successRate > 0 && !isNaN(successRate)) {
                        desiredCount = Math.floor(existingCount / successRate);
                    } else {
                        desiredCount = 1;
                    }
                    let energyRequired = energyReqForCreep(roleName, tier);
                    let roleTier = Math.min(Math.floor(tier * energyAvailable / energyRequired), tier);
                    let alreadyQueued = _.sum(spawn.memory.spawnQueue, {filter: (creep) => creep.role === roleName && creep.tier === roleTier});

                    const spawnCount = desiredCount - existingCount - alreadyQueued;
                    // console.log("T"+roleTier+roleName,"SR:"+Math.round(successRate*100)+"%",desiredCount+" (desired) -"+existingCount+" (existing) ="+spawnCount+" (to spawn)", energyAvailable+" (available) -"+energyQueued+" (queued) /"+energyRequired+" (required)");
                    for (let i = 0; i < spawnCount; i++) {
                        if (energyAvailable - energyQueued >= energyRequired) {
                            console.log(`Spawning by Role Rate ${roleName} ${successRate * 100}%  D:${desiredCount} - E:${existingCount} - Q:${alreadyQueued} = S:${spawnCount}`)
                            addToSpawnQueue(spawn, role.roleName, roleTier, 1);
                            energyAvailable = energyAvailable - energyRequired;
                            energyQueued = energyQueued + energyRequired;
                        }
                    }
                } catch (e) {
                    console.log(roleName)
                    throw e
                }
            }
        }
    },
};

function addToSpawnQueue(spawn, roleName, tier, count) {
    console.log(`Queing to spawn ${count}x T${tier}${roleName}`)
    for (let i = 0; i < count; i++) {
        spawn.memory.spawnQueue.push({role: roleName, tier: tier});
    }
    utils.addStat(`rooms.${spawn.room.name}.creepsSpawned`, count)
}

function spawnRole(spawn, role, tier) {
    if (spawn.spawning) {
        return ERR_BUSY;
    }
    if (tier <=0) {
        return ERR_FULL;
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
