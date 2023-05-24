const roomManager = require('controllers/RoomManager');
const spawnController = require('controllers/Spawner');
const creepsController = require('controllers/Creeps');
const towerController = require('controllers/Towers');

const config = require("config");
const utils = require("utils");
const creepRoles = require("roles");

require('main-init');
module.exports = {
    loop:  wrapWithMemoryHack(function () {
        roomManager.run();
        creepsController.run();
        towerController.run();
        spawnController.run();
    }),
};

function wrapLoop(fn) {
    let memory;
    let tick;

    return () => {
        if (tick && tick + 1 === Game.time && memory) {
            delete global.Memory;
            global.Memory = memory;
        } else {
            memory = Memory;
        }
        tick = Game.time;
        fn();
        
        RawMemory.set(JSON.stringify(Memory));
//        RawMemory._parsed = Memory;
    };
}
function wrapWithMemoryHack(fn) {
    const memory = Memory;

    return () => {
        delete global.Memory;
        global.Memory = memory;
        fn();

//        RawMemory.set(JSON.stringify(Memory));
          RawMemory._parsed = Memory;
    };
};