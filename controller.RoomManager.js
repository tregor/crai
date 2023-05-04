const config = require('./config');
const creepRoles = require('./roles');

const RoomManager = {
    run: function () {
        let myRooms = {};
        for (const name in Game.spawns) {
            myRooms[Game.spawns[name].room.name] = Game.spawns[name].room;
        }
        for (const roomName in myRooms) {
            const room = myRooms[roomName];
            // 1. Активировать безопасный режим, если доступен, когда контроллер получает слишком много урона.
            if (room.controller && room.controller.safeModeAvailable && room.controller.safeModeCooldown === 0 && (room.controller.hits / room.controller.hitsMax < 0.02)) {
                room.controller.activateSafeMode();
            }

            // 2. Определить, если комната находится в аварийном состоянии, и задать соответствующий флаг.
            room.memory.isFight = (room.find(FIND_HOSTILE_CREEPS).length > 0 || room.find(FIND_HOSTILE_STRUCTURES).length > 0);


            // 3. Создание задач
            // 3.1. Поддержание downgrade контроллера
            if (room.controller.ticksToDowngrade < 9999) {
                const resourceType = RESOURCE_ENERGY; // тип ресурса, который нужно доставить
                const amount = 50; // количество ресурса, которое нужно доставить
                const destination = Game.spawns['Spawn1']; // объект, куда нужно доставить ресурс
                const priority = 1; // приоритет задачи

                // const task = new DeliverTask(destination, resourceType, amount, priority); // создание задачи доставки

            }
        }
    }
};

require('controller.Tasker');

module.exports = RoomManager;
