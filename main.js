const creepsController = require('./controllerCreeps');
const spawnController = require('./controllerSpawner');
const roomManager = require('./controller.RoomManager');
const config = require('./config');

module.exports.loop = function () {
    roomManager.run();
    spawnController.run();
  creepsController.run();
};
