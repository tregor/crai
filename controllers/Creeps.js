const config = require('../config');
const utils = require("../utils");
const creepRoles = require('../roles');

const controllerCreeps = {
    run: function () {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const role = creepRoles[creep.memory.role];

            if(creep.spawning) continue;
            if(creep.idle) continue;

            // Initing creep's memory
            if (!creep.spawning && !creep.initialized()){
                creep.init();
            }

            // Handling death of creep
            if (creep.ticksToLive === 1) {
                creep.say('☠️ dying');
                for(const resourceType in creep.carry) {
                    creep.drop(resourceType);
                }
                delete Memory.creeps[creep.name];
                continue;
            }

            if (role) {
                role.run(creep);
            }
        }

        for (const creepName in Memory.creeps) {
            if (!(creepName in Game.creeps)) {
                const creepMemory = Memory.creeps[creepName];
                delete Memory.creeps[creepName];
            }
        }
    }
};

module.exports = controllerCreeps;
