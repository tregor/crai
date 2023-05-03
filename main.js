const creepsController = require('./controllerCreeps');
const spawnController = require('./controllerSpawner');
const roomManager = require('./controller.RoomManager');
const towerController = require('./controller.towers');
const config = require('./config');
// const creepRoles = require('./roles');

module.exports = {
    loop: function () {
        roomManager.run();
        spawnController.run();
        creepsController.run();
        towerController.run();
    }
};

