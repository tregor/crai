const creepsController = require('./controllerCreeps');
const spawnController = require('./controllerSpawner');
const config = require('./config');

module.exports.loop = function () {
  spawnController.run();
  creepsController.run();
};
