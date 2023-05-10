const roomManager = require('./controller.RoomManager');
const spawnController = require('./controller.Spawner');
const creepsController = require('./controller.Creeps');
const towerController = require('./controller.Towers');

const config = require('./config');
const utils = require("./utils");
const creepRoles = require('./roles');

require('extends.Creep');

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
            // this line is required to disable the default Memory deserialization
            delete global.Memory;
            Memory = memory;
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

        RawMemory.set(JSON.stringify(Memory));
    };
};