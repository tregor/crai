const roomManager = require('./controller.RoomManager');
const spawnController = require('./controller.Spawner');
const creepsController = require('./controller.Creeps');
const towerController = require('./controller.Towers');

const config = require('./config');
const utils = require("./utils");
const creepRoles = require('./roles');
require('extends.Creep');

module.exports = {
    loop:  wrapLoop(function () {
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
            // this line is required to disable the default Memory deserialization
            delete global.Memory;
            Memory = memory;
        } else {
            memory = Memory;
        }

        tick = Game.time;

        fn();

        // there are two ways of saving Memory with different advantages and disadvantages
        // 1. RawMemory.set(JSON.stringify(Memory));
        // + ability to use custom serialization method
        // - you have to pay for serialization
        // - unable to edit Memory via Memory watcher or console
        // 2. RawMemory._parsed = Memory;
        // - undocumented functionality, could get removed at any time
        // + the server will take care of serialization, it doesn't cost any CPU on your site
        // + maintain full functionality including Memory watcher and console

        // this implementation uses the official way of saving Memory
        RawMemory.set(JSON.stringify(Memory));
//        RawMemory._parsed = Memory;
    };
}