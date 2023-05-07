const creepRoles = require("./roles");
const config = require("./config");

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
            for (const name in myCreeps) {
                const creep = myCreeps[name];
                if (!roleCounts[creep.memory.role]) {
                    roleCounts[creep.memory.role] = 1;
                } else {
                    roleCounts[creep.memory.role]++;
                }

            }

            if (room.energyCapacityAvailable < config.energyPerTiers[tier]) {
                console.log(`Downgrade T${tier}=>T${tier - 1}`)
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
            // console.log(Object.keys(creepRoles), Object.keys(creepRolesAvailable));


            // Создаем очередь спавна, если ее еще нет
            if (!spawn.memory.spawnQueue) {
                spawn.memory.spawnQueue = [];
            }
            if (!spawn.memory.debugFull) {
                spawn.memory.debugFull = [];
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
            const cpuUsage = Game.cpu.getUsed() * 100;
            createDebugVisual(room.name, spawn.pos.x, spawn.pos.y,
                ` T${tier} ${Math.round(room.controller.progress / room.controller.progressTotal * 100)}%(${room.controller.progress})`,
                ` NRG: ${energyAvailable}/${room.energyCapacityAvailable} +${energyQueued}`,
                ` CPU: ${cpuUsage.toFixed(2)}`,
                ` Creeps: ${myCreeps.length}`,
            );
            if (spawn.memory.debugFull) {
                createDebugVisual(room.name, spawn.pos.x, spawn.pos.y + 1,
                    JSON.stringify(spawn.memory.debugFull),
                );
            }

            //""" Главная логика спавнов и добавления в очереди

            // Добавляем рабочего на 1 место очереди спавна если у нас нет рабочих
            if (roleCounts['worker'] === 0 && energyAvailable >= 300) {
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
                let desiredCount = Math.ceil(Math.max(existingCount, 0.01) / successRate);
                let energyRequired = energyReqForCreep(roleName, tier);
                let roleTier = Math.min(Math.ceil(tier * energyAvailable / energyRequired), tier);
                spawn.memory.debugFull[creepRolesAvailable[roleName]] = `e:${existingCount} s:${successRate} d:${desiredCount} n:${energyRequired}`;

                let alreadyQueued = _.sum(spawn.memory.spawnQueue, {filter: (creep) => creep.role === roleName && creep.tier === roleTier});
                const spawnCount = desiredCount - existingCount - alreadyQueued;
                for (let i = 0; i < spawnCount; i++) {
                    if (energyAvailable - energyQueued >= energyRequired) {
                        addToSpawnQueue(spawn, role.roleName, roleTier, 1);
                        energyAvailable = energyAvailable - energyRequired;
                        energyQueued = energyQueued + energyRequired;
                    }
                }
            }

            // Сортируем очередь спавна по getSuccessRate
            // spawn.memory.spawnQueue.sort((a, b) => {
            //     const roleA = creepRoles[a.role];
            //     const roleB = creepRoles[b.role];
            //     const successRateA = roleA.getSuccessRate(spawn.room) || 0;
            //     const successRateB = roleB.getSuccessRate(spawn.room) || 0;
            //     return successRateA - successRateB;
            // });
        }
    },
};

function addToSpawnQueue(spawn, roleName, tier, count) {
    console.log(`Queing to spawn ${count}x T${tier}${roleName}`)
    for (let i = 0; i < count; i++) {
        spawn.memory.spawnQueue.push({role: roleName, tier: tier});
    }
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

function createDebugVisual(roomName, x, y, ...texts) {
    const room = Game.rooms[roomName];
    const visual = new RoomVisual(roomName);
    visual.getTextWidth = function (text, opts) {
        let fontSize = opts.font || 0.5;
        return text.length * fontSize * 0.4; // approximate width
    };
    const fontSize = 0.2;
    const padding = 0.2;
    let maxWidth = 0;
    let totalHeight = texts.length * fontSize;

    // Calculate the maximum width of all the texts
    for (let text of texts) {
        let textWidth = visual.getTextWidth(text, {font: fontSize});
        maxWidth = Math.max(maxWidth, textWidth);
    }

    // Add padding to the width and height
    let rectWidth = maxWidth + (2 * padding);
    let rectHeight = totalHeight + (2 * padding);

    // Draw the rectangle and the text
    new RoomVisual(roomName)
        .rect(x - (rectWidth / 2), y - (rectHeight / 2), rectWidth, rectHeight, {fill: 'black', opacity: 0.7});

    for (let i = 0; i < texts.length; i++) {
        let text = texts[i];
        let textWidth = visual.getTextWidth(text, {font: fontSize});
        let textX = x;
        let textY = y - (totalHeight / texts.length) + (i * fontSize);
        new RoomVisual(roomName).text(text, textX, textY, {font: fontSize});
    }
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
