const roomManager = require('./controller.RoomManager');
const spawnController = require('./controller.Spawner');
const creepsController = require('./controller.Creeps');
const towerController = require('./controller.Towers');

const config = require('./config');
const utils = require("./utils");
const creepRoles = require('./roles');
require('extends.Creep');

module.exports = {
    loop: function () {
        while (Game.cpu.tickLimit * 0.8 > Game.cpu.getUsed()) {
            if (!this.run()) {
                break;
            }
        }
    },
    run: function(){
        let res1 = roomManager.run();
        let res2 = creepsController.run();
        let res3 = towerController.run();
        let res4 = spawnController.run();
        return (res1 && res2 && res3 && res4)
    }
};
