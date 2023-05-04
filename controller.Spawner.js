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
            const numWorkers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'worker'}}}).length;
            if ((room.energyCapacityAvailable < energyReqForTier(tier)) && room.energyAvailable >= energyReqForTier(tier - 1)) {
                tier = tier - 1;
            }
            const minCreepsForTier = config.creepsPerTier[tier - 1];
            // const minCreepsForTier = 1;
            createDebugVisual(room.name, spawn.pos.x, spawn.pos.y,
                `T${tier} (${Math.round(room.controller.progress / room.controller.progressTotal * 100)}%)`,
                `Energy: ${room.energyAvailable}/${energyReqForTier(tier)} (${room.energyCapacityAvailable})`,
                `CPU Usage: ${cpuUsage.toFixed(2)}`,
                `Num Creeps: ${myCreeps.length}`,
            );

            if (spawn.spawning) {
                continue;
            }
            if (numWorkers === 0 && room.energyAvailable >= 300) {
                spawnRole(config.defaultSpawn, creepRoles.worker, 1);
                continue;
            }
            if ((room.energyAvailable < energyReqForTier(tier))) {
                continue;
            }

            let rolesToSpawnCount = {};
            for (const roleName in creepRoles) {
                const role = creepRoles[roleName];
                const existingCount = roleCounts[roleName] || 0;
                const successRate = Math.max(role.getSuccessRate(spawn.room), 0.01).toFixed(2);
                const desiredCount = Math.max(calculateRequiredCreeps(existingCount, successRate), minCreepsForTier);

                if ((desiredCount - existingCount) > 0) {
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
                }
            }
            console.log(JSON.stringify(rolesToSpawnCount));
            for (const roleToSpawn in rolesToSpawnCount) {
                //TODO: Spawn roles from demand list by priorities (dyn setted from tasker)
                for (let i = 0; i < rolesToSpawnCount[roleToSpawn]; i++) {
                    spawnRole(spawn, creepRoles[roleToSpawn], tier);
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
        // console.log('Spawning new worker:', creepName, ` in room`, spawn.room.name, 'for cost', cost);
    } else {
        console.log(`The cost of a ${role.roleName} of Tier ${tier} is ${cost} energy units while ${spawn.room.energyAvailable} available.` + result);
    }
    return result;
}

module.exports = spawnerController;
