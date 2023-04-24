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
            let spawning = false;
            // const maxTier = Math.floor(room.energyAvailable / config.energyPerTier);
            let tier = room.controller.level;

            if (spawn.spawning) {
                continue;
            }

            for (const name in myCreeps) {
                const creep = myCreeps[name];
                if (!roleCounts[creep.memory.role]) {
                    roleCounts[creep.memory.role] = 1;
                } else {
                    roleCounts[creep.memory.role]++;
                }
            }

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
            if ((room.energyAvailable < energyReqForTier(tier))) {
                if ((room.energyCapacityAvailable < energyReqForTier(tier)) && room.energyAvailable >= energyReqForTier(tier - 1)) {
                    tier = tier - 1;
                } else {
                    continue;
                }
            }


            console.log('Energy avaliable: ' + room.energyAvailable + ' to spawn T' + tier);
            console.log('Role counts: ' + JSON.stringify(roleCounts));
            if (!roleCounts['worker'] || roleCounts['worker'] < tier) {
                spawnRole(config.defaultSpawn, creepRoles.worker, tier);
                continue;
            }
            for (const roleName in creepRoles) {
                const role = creepRoles[roleName];
                const existingCount = roleCounts[roleName] || 0;
                const successRate = role.getSuccessRate(spawn.room).toFixed(2);
                const desiredCount = Math.max(calculateRequiredCreeps(existingCount, successRate), tier);

                console.log(roleName + " s: " + (successRate * 100) + "%" + ", a: " + existingCount + ", d: " + desiredCount);
                if ((desiredCount - existingCount) > 0) {
                    spawnRole(spawn, role, tier);
                    spawning = true;
                    break;
                }
                if ((existingCount - desiredCount) > 0) {
                    if (myCreeps < 16) { // Minimal creeps to keep alive
                        continue;
                    }
                    let target = null;
                    const targets = _.filter(Game.creeps, (creep) => creep.memory.role === roleName);
                    if (targets.length) {
                        target = targets[0];
                        for (let i = 1; i < targets.length; i++) {
                            if (targets[i].ticksToLive < target.ticksToLive) {
                                target = targets[i];
                            }
                        }
                        target.say('💀 suicide');
                        target.suicide();
                    }
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
