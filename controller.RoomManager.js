const config = require('./config');
const creepRoles = require('./roles');

require('controller.Tasker');

const RoomManager = {
    run: function () {
        if (!Memory.roadFrequency) {
            Memory.roadFrequency = {};
        }



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


            // 4. Автоматическая стройка дорог по рейтингу
            const roadThreshold = 10000
            drawRoadUsage(room);
            if (!room.memory.roadUsage) {
                room.memory.roadUsage = {};
            }
            for (const posKey in room.memory.roadUsage) {
                if (room.memory.roadUsage[posKey] >= roadThreshold) {
                    const [x, y] = posKey.split(",");
                    const pos = new RoomPosition(parseInt(x), parseInt(y), roomName);

                    const structures = pos.lookFor(LOOK_STRUCTURES);
                    const hasRoad = structures.some((structure) => structure.structureType === STRUCTURE_ROAD);

                    if (!hasRoad) {
                        room.createConstructionSite(pos, STRUCTURE_ROAD);
                    }
                    Game.notify(`New road was built at ${pos.x},${pos.y} ${roomName}`);

                    // Сбросить счетчик после строительства дороги
                    room.memory.roadUsage[posKey] = 0;
                }
            }
        }
    }
};
function drawRoadUsage(room) {
    const maxUsage = Math.max(...Object.values(room.memory.roadUsage));

    for (const posKey in room.memory.roadUsage) {
        const [x, y] = posKey.split(",");
        const pos = new RoomPosition(parseInt(x), parseInt(y), room.name);
        const usage = room.memory.roadUsage[posKey];

        // Вычисляем usageRate от 1 до 10
        const usageRate = Math.ceil((usage / maxUsage) * 10);

        room.visual.text(usageRate, pos, {
            font: 0.5,
            align: "center",
            opacity: 0.8,
        });
    }
}


module.exports = RoomManager;
