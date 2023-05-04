const roomManager = require('./controller.RoomManager');
const spawnController = require('./controller.Spawner');
const creepsController = require('./controller.Creeps');
const towerController = require('./controller.Towers');

module.exports = {
    loop: function () {
        roomManager.run();
        spawnController.run();
        creepsController.run();
        towerController.run();
    }
};

