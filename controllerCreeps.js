const config = require('./config');
const creepRoles = require('./roles');

const controllerCreeps = {
    run: function () {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const role = creepRoles[creep.memory.role];

            if (role) {
                role.run(creep);
            }
        }
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                console.log(`Creep ${name} was dead.`)
                delete Memory.creeps[name];
            }
        }
    }
};

module.exports = controllerCreeps;
