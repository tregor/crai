const creepRoles = require("./roles");
const config = require("./config");

const spawnerController = {
    run: function () {
        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            const room = spawn.room;
            const myCreeps = room.find(FIND_MY_CREEPS);
            const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
            const emergency = hostileCreeps.length > 0;
            let roleCounts = {};
            for (const name in myCreeps) {
                const creep = myCreeps[name];
                if (!roleCounts[creep.memory.role]) {
                    roleCounts[creep.memory.role] = 1;
                } else {
                    roleCounts[creep.memory.role]++;
                }

            }
            let spawning = false;
            // const maxTier = Math.floor(room.energyAvailable / config.energyPerTier);
            let tier = room.controller.level;
            const energyReqForTier = function (tier) {
                let cost_max = 0;
                for (const roleName in creepRoles) {
                    const role = creepRoles[roleName];
                    const body = role.getBody(tier);
                    const cost = calculateCreepCost(body);
                    if (cost > cost_max) {
                        cost_max = cost;
                    }
                }
                return cost_max;
            }

            // Display debug information using RoomVisuals
            const cpuUsage = Game.cpu.getUsed() * 100;
            const numCreeps = Object.keys(Game.creeps).length;
            createDebugVisual(room.name, spawn.pos.x, spawn.pos.y,
                `T${tier} Spawner`,
                `Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}(${energyReqForTier(tier)})`,
                `CPU Usage: ${cpuUsage.toFixed(2)}`,
                `Num Creeps: ${numCreeps}`,
            );

            if (spawn.spawning) {
                continue;
            }
            if ((room.energyAvailable < energyReqForTier(tier))) {
                if ((room.energyCapacityAvailable < energyReqForTier(tier)) && room.energyAvailable >= energyReqForTier(tier - 1)) {
                    tier = tier - 1;
                } else {
                    continue;
                }
            }
            const primes = [2, 3, 5, 7, 11, 13, 17, 19];
            const minCreepsForTier = primes[tier - 1];
            if (!roleCounts['worker'] || roleCounts['worker'] < minCreepsForTier) {
                spawnRole(config.defaultSpawn, creepRoles.worker, tier);
                continue;
            }
            let rolesToSpawnCount = {};
            for (const roleName in creepRoles) {
                const role = creepRoles[roleName];
                const existingCount = roleCounts[roleName] || 0;
                const successRate = Math.max(role.getSuccessRate(spawn.room), 0.01).toFixed(2);
                const desiredCount = Math.max(calculateRequiredCreeps(existingCount, successRate), minCreepsForTier);

                console.log(roleName + " s: " + (successRate * 100) + "%" + ", a: " + existingCount + ", d: " + desiredCount);
                if ((desiredCount - existingCount) > 0) {
                    // spawnRole(spawn, role, tier);
                    if (!rolesToSpawnCount[roleName]) {
                        rolesToSpawnCount[roleName] = (desiredCount - existingCount);
                    } else {
                        rolesToSpawnCount[roleName] += (desiredCount - existingCount);
                    }
                }
                if ((existingCount - desiredCount) > 0) {
                    if (!rolesToSpawnCount[roleName]) {
                        rolesToSpawnCount[roleName] = (desiredCount - existingCount);
                    } else {
                        rolesToSpawnCount[roleName] += (desiredCount - existingCount);
                    }
                    if (myCreeps < 16) { // Minimal creeps to keep alive

                    }
                    // let target = null;
                    // const targets = _.filter(Game.creeps, (creep) => creep.memory.role === roleName);
                    // if (targets.length) {
                    //     target = targets[0];
                    //     for (let i = 1; i < targets.length; i++) {
                    //         if (targets[i].ticksToLive < target.ticksToLive) {
                    //             target = targets[i];
                    //         }
                    //     }
                    //     target.say('💀 suicide');
                    //     target.suicide();
                    // }
                }
            }
            console.log(JSON.stringify(rolesToSpawnCount));
            for (const roleToSpawn in rolesToSpawnCount) {
                for (let i = 1; i < rolesToSpawnCount[roleToSpawn]; i++) {
                    let energyBefore = spawn.room.energyAvailable;
                    spawnRole(spawn, creepRoles[roleToSpawn], tier);
                    let energyAfter = spawn.room.energyAvailable;
                    spawning = true
                    break;
                }
                if (spawning) {
                    break;
                }
            }
            if (!spawn.spawning && !spawning && (room.energyAvailable === room.energyCapacityAvailable)) {
                if (spawnRole(config.defaultSpawn, creepRoles.worker, tier) === ERR_NOT_ENOUGH_ENERGY) {
                    spawnRole(config.defaultSpawn, creepRoles.worker, (tier - 1))
                }
            }
        }
    },
};

function calculateRequiredCreeps(existingCount, efficiency) {
    if (efficiency <= 0) {
        return 1;
    }

    return Math.ceil(existingCount / (efficiency));
}

function calculateCreepCost(body) {
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
    const cost = calculateCreepCost(body);
    const result = spawn.spawnCreep(body, creepName, {memory: memory});

    if (result === OK) {
        console.log('Spawning new worker:', creepName, ` in room`, spawn.room.name, 'for cost', cost);
    } else {
        console.log(`The cost of a ${role.roleName} of Tier ${tier} is ${cost} energy units while ${spawn.room.energyAvailable} available.`);
    }
    return result;
}

module.exports = spawnerController;
