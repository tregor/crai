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
    }
};

module.exports = controllerCreeps;
