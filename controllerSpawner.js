const creepRoles = require("./roles");
const config = require("./config");

const spawnerController = {
    run: function () {
        const roleCounts = {};
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            if (!roleCounts[creep.memory.role]) {
                roleCounts[creep.memory.role] = 1;
            } else {
                roleCounts[creep.memory.role]++;
            }
        }
        // console.log(JSON.stringify(roleCounts));

        for (const spawnName in Game.spawns) {
            const spawn = Game.spawns[spawnName];
            const room = spawn.room;
            const energyAvailable = room.energyAvailable;
            const myCreeps = room.find(FIND_MY_CREEPS);
            const hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
            const emergency = hostileCreeps.length > 0;
            const maxTier = Math.floor(energyAvailable / 200);
            const tier = Math.min(maxTier, 8); // максимальный Tier = 8

            if (spawn.spawning) {
                continue;
            }
            if (room.energyAvailable < 200) {
                continue; //Wait until tier I
            }
            if (room.energyAvailable < room.energyCapacityAvailable) {
                continue; //Wait until max charge
            }

            if (myCreeps.length === 0) {
                spawnRole(config.defaultSpawn, creepRoles.worker, 1)
                continue;
            }


            console.log('Energy avaliable: ' + energyAvailable + ' to spawn T' + tier);
            for (const roleName in creepRoles) {
                const role = creepRoles[roleName];
                const existingCount = roleCounts[roleName] || 0;
                const successRate = role.getSuccessRate().toFixed(2);
                const desiredCount = calculateRequiredCreeps(existingCount, successRate);

                if ((desiredCount - existingCount) > 0) {
                    console.log(roleName + " s: " + (successRate * 100) + "%" + ", e: " + existingCount + ", d: " + desiredCount);
                    spawnRole(spawn, role, tier);
                }
                if ((existingCount - desiredCount) > 0) {
                    if (Game.creeps.length > 6) { //Не убивать крипов если в комнате их менее 6
                        let target = null;
                        const targets = _.filter(Game.creeps, (creep) => creep.memory.role === roleName);
                        if (targets.length > 0) {
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

                if ((desiredCount - existingCount) !== 0) {
                    return;
                }
            }
            if (energyAvailable === room.energyAvailable) {
                spawnRole(config.defaultSpawn, creepRoles.worker, tier)
            }
        }
    },
};

function calculateRequiredCreeps(existingCount, efficiency) {
    if (efficiency <= 0) {
        return 1;
    }

    return Math.ceil(existingCount / efficiency);
}

function calculateCreepCost(body) {
    let cost = 0;
    for (let i = 0; i < body.length; i++) {
        cost += BODYPART_COST[body[i]];
    }
    return cost;
}


function spawnRole(spawn, role, tier) {
    // Спавним крипа
    const body = role.getBody(tier);
    const creepName = (role.roleName.charAt(0).toUpperCase() + role.roleName.slice(1)) + '_' + Game.time;
    const memory = {...role.memory, role: role.roleName, tier: tier};
    const cost = calculateCreepCost(body);
    if (spawn.room.energyAvailable >= cost) {
        const result = spawn.spawnCreep(body, creepName, {memory: memory});
        if (result === OK) {
            console.log('Spawning new worker:', creepName, 'in room', spawn.room.name);
            // Добавляем поведение emergency, если необходимо
            // if (emergency) {
            //     room.memory.emergency = true;
            // }
        }
    } else {
        console.log(`The cost of a ${role.roleName} of Tier ${tier} is ${cost} energy units.`);
    }
}

module.exports = spawnerController;
