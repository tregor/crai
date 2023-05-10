const config = require('./config');
const utils = require('./utils');
const creepRoles = require('./roles');

require('controller.Tasker');

const RoomManager = {
    run: function () {
        let myRooms = {};
        for (const name in Game.spawns) {
            myRooms[Game.spawns[name].room.name] = Game.spawns[name].room;
        }
        for (const roomName in myRooms) {
            const room = myRooms[roomName];
            const eventLog = room.getEventLog();

            if (Object.keys(Memory.stats.ticks).length > config.statsMaxTicks) {
                const minTick = Math.min(...Object.keys(Memory.stats.ticks));
                delete Memory.stats.ticks[minTick];
            }
            // Инициализация статистики для текущей комнаты
            const roomStatsPath = `rooms.${roomName}`;
            if (!utils.getStat(roomStatsPath)) {
                utils.setStat(`${roomStatsPath}.energyHarvested`, 0);
                //                utils.setStat(`${roomStatsPath}.mineralsHarvested`, 0);
                //                utils.setStat(`${roomStatsPath}.energySpentOnRepair`, 0);
                utils.setStat(`${roomStatsPath}.energyDeliveredToController`, 0);
                utils.setStat(`${roomStatsPath}.energyDeliveredToExtensions`, 0);

                utils.setStat(`${roomStatsPath}.creepsDied`, 0);
                utils.setStat(`${roomStatsPath}.creepsSpawned`, 0);
                utils.setStat(`${roomStatsPath}.energyInSpawns`, 0);
                utils.setStat(`${roomStatsPath}.energyInExtensions`, 0);
                utils.setStat(`${roomStatsPath}.energyInContainers`, 0);
            }


            // 1. Активировать безопасный режим, если доступен, когда контроллер получает слишком много урона.
            // 2. Определить, если комната находится в аварийном состоянии, и задать соответствующий флаг.
            room.memory.isFight = (room.find(FIND_HOSTILE_CREEPS).length > 0 || room.find(FIND_HOSTILE_STRUCTURES).length > 0);
            if (room.memory.isFight && room.controller && room.controller.safeModeAvailable && room.controller.safeModeCooldown === 0 && (room.controller.hits / room.controller.hitsMax < 0.02)) {
                room.controller.activateSafeMode();
            }



            // 3. Создание задач
            // 3.1. Поддержание downgrade контроллера
            if (room.controller.ticksToDowngrade < 9999) {
                const resourceType = RESOURCE_ENERGY; // тип ресурса, который нужно доставить
                const amount = 50; // количество ресурса, которое нужно доставить
                const destination = room.controller; // объект, куда нужно доставить ресурс
                const priority = 1; // приоритет задачи
                // const task = new DeliverTask(destination, resourceType, amount, priority); // создание задачи доставки
            }


            // 4. Автоматическая стройка дорог по рейтингу
            if (config.drawDistMap) {
                utils.drawDistanceTransform(room)
            }
            if (config.drawRoadMap || config.drawHeatMap) {
                utils.drawRoadUsage(room)
                for (const posKey in room.memory.roadUsage) {
                    if (room.memory.roadUsage[posKey] >= config.roadThreshold) {
                        const [x, y] = posKey.split(",");
                        const pos = new RoomPosition(parseInt(x), parseInt(y), roomName);

                        const structures = pos.lookFor(LOOK_STRUCTURES);
                        const hasRoad = structures.some((structure) => structure.structureType === STRUCTURE_ROAD);
                        const hasSome = structures.some((structure) => structure.my);

                        if (!hasRoad && !hasSome) {
                            room.createConstructionSite(pos, STRUCTURE_ROAD);
                            Game.notify(`New road was built at ${pos.x},${pos.y} ${roomName}`);
                            // Сбросить счетчик после строительства дороги
                            room.memory.roadUsage[posKey] = 0;
                        }
                    }
                }
            }

            // 5. Чтение билд планов из файла:
//            const buildplan = JSON.parse('{"spawn":{"pos":[{"x":9,"y":20},{"x":5,"y":23},{"x":4,"y":22}]},"extension":{"pos":[{"x":6,"y":19},{"x":7,"y":18},{"x":8,"y":19},{"x":9,"y":18},{"x":10,"y":19},{"x":11,"y":18},{"x":12,"y":19},{"x":13,"y":18},{"x":14,"y":19},{"x":5,"y":18},{"x":6,"y":17},{"x":8,"y":17},{"x":10,"y":17},{"x":12,"y":17},{"x":14,"y":17},{"x":13,"y":16},{"x":11,"y":16},{"x":9,"y":16},{"x":7,"y":16},{"x":5,"y":16},{"x":14,"y":15},{"x":12,"y":15},{"x":10,"y":15},{"x":8,"y":15},{"x":6,"y":15},{"x":13,"y":14},{"x":11,"y":14},{"x":9,"y":14},{"x":7,"y":14},{"x":5,"y":14},{"x":4,"y":15},{"x":3,"y":14},{"x":3,"y":16},{"x":2,"y":15},{"x":15,"y":14},{"x":15,"y":16},{"x":16,"y":15},{"x":17,"y":16},{"x":17,"y":14},{"x":15,"y":12},{"x":16,"y":13},{"x":17,"y":12},{"x":14,"y":13},{"x":13,"y":12},{"x":12,"y":13},{"x":11,"y":12},{"x":10,"y":13},{"x":9,"y":12},{"x":8,"y":13},{"x":7,"y":12},{"x":6,"y":13},{"x":5,"y":12},{"x":4,"y":13},{"x":3,"y":12},{"x":2,"y":13},{"x":2,"y":11},{"x":4,"y":11},{"x":6,"y":11},{"x":8,"y":11},{"x":10,"y":11}]},"container":{"pos":[{"x":4,"y":17},{"x":12,"y":24},{"x":11,"y":24},{"x":25,"y":19}]},"road":{"pos":[{"x":20,"y":22},{"x":20,"y":22},{"x":20,"y":23},{"x":20,"y":24},{"x":19,"y":24},{"x":19,"y":24},{"x":18,"y":24},{"x":17,"y":24},{"x":16,"y":24},{"x":15,"y":24},{"x":14,"y":24},{"x":14,"y":24},{"x":13,"y":24},{"x":19,"y":23},{"x":17,"y":23},{"x":14,"y":23},{"x":10,"y":23},{"x":7,"y":23},{"x":6,"y":23},{"x":5,"y":22},{"x":5,"y":21},{"x":6,"y":21},{"x":6,"y":22},{"x":7,"y":21},{"x":7,"y":22},{"x":8,"y":22},{"x":8,"y":21},{"x":8,"y":21},{"x":9,"y":21},{"x":9,"y":22},{"x":10,"y":21},{"x":10,"y":22},{"x":11,"y":21},{"x":11,"y":21},{"x":12,"y":21},{"x":12,"y":22},{"x":11,"y":22},{"x":14,"y":22},{"x":13,"y":21},{"x":13,"y":21},{"x":14,"y":21},{"x":15,"y":21},{"x":15,"y":22},{"x":16,"y":22},{"x":16,"y":21},{"x":17,"y":21},{"x":17,"y":22},{"x":18,"y":21},{"x":20,"y":22},{"x":18,"y":22},{"x":19,"y":22},{"x":18,"y":23},{"x":17,"y":23},{"x":15,"y":23},{"x":16,"y":23},{"x":13,"y":23},{"x":13,"y":22},{"x":12,"y":23},{"x":11,"y":23},{"x":9,"y":23},{"x":8,"y":23},{"x":5,"y":17},{"x":6,"y":19},{"x":7,"y":19},{"x":6,"y":18},{"x":6,"y":20},{"x":8,"y":20},{"x":5,"y":18},{"x":5,"y":19},{"x":5,"y":20},{"x":7,"y":18},{"x":6,"y":17},{"x":7,"y":17},{"x":8,"y":17},{"x":8,"y":18},{"x":8,"y":19},{"x":8,"y":20}]},"tower":{"pos":[{"x":14,"y":20},{"x":13,"y":20},{"x":12,"y":20},{"x":11,"y":20},{"x":10,"y":20},{"x":15,"y":20}]},"link":{"pos":[{"x":11,"y":32},{"x":28,"y":2},{"x":5,"y":20}]},"extractor":{"pos":[{"x":7,"y":29}]},"terminal":{"pos":[{"x":8,"y":20}]},"lab":{"pos":[{"x":10,"y":30},{"x":8,"y":30},{"x":9,"y":31},{"x":7,"y":31},{"x":8,"y":32},{"x":10,"y":32},{"x":9,"y":29},{"x":7,"y":33},{"x":9,"y":33},{"x":11,"y":33}]},"storage":{"pos":[{"x":4,"y":21}]},"observer":{"pos":[{"x":6,"y":20}]},"powerSpawn":{"pos":[{"x":7,"y":20}]},"constructedWall":{"pos":[{"x":1,"y":14},{"x":1,"y":15},{"x":1,"y":8},{"x":1,"y":9},{"x":3,"y":4},{"x":4,"y":4},{"x":8,"y":4},{"x":9,"y":4},{"x":11,"y":4},{"x":10,"y":4},{"x":11,"y":5},{"x":11,"y":7},{"x":11,"y":6}]}}');
            const buildplan = JSON.parse('{"name":"W38S42","shard":"shard3","rcl":8,"buildings":{"constructedWall":{"pos":[{"x":9,"y":2},{"x":10,"y":2},{"x":12,"y":2},{"x":11,"y":2},{"x":24,"y":2},{"x":17,"y":2},{"x":18,"y":2},{"x":23,"y":2},{"x":44,"y":9},{"x":43,"y":9},{"x":43,"y":8},{"x":11,"y":0},{"x":12,"y":0},{"x":13,"y":0},{"x":14,"y":0},{"x":15,"y":0},{"x":16,"y":0},{"x":17,"y":0},{"x":18,"y":0},{"x":19,"y":0},{"x":20,"y":0},{"x":21,"y":0},{"x":22,"y":0},{"x":34,"y":0},{"x":35,"y":0},{"x":36,"y":0},{"x":37,"y":0},{"x":38,"y":0},{"x":39,"y":0},{"x":40,"y":0},{"x":41,"y":0},{"x":42,"y":0},{"x":43,"y":0},{"x":2,"y":49},{"x":3,"y":49},{"x":4,"y":49},{"x":5,"y":49},{"x":6,"y":49},{"x":7,"y":49},{"x":8,"y":49},{"x":9,"y":49},{"x":10,"y":49},{"x":11,"y":49},{"x":12,"y":49},{"x":13,"y":49},{"x":47,"y":12},{"x":47,"y":13},{"x":47,"y":14},{"x":47,"y":15},{"x":47,"y":16},{"x":47,"y":17},{"x":47,"y":18},{"x":47,"y":19},{"x":47,"y":20},{"x":47,"y":21},{"x":47,"y":22},{"x":47,"y":23},{"x":47,"y":24},{"x":47,"y":25},{"x":47,"y":26},{"x":47,"y":27},{"x":46,"y":27},{"x":47,"y":28},{"x":45,"y":27},{"x":47,"y":30},{"x":45,"y":29},{"x":47,"y":29},{"x":44,"y":29},{"x":47,"y":31},{"x":46,"y":31},{"x":47,"y":32},{"x":45,"y":31},{"x":47,"y":33},{"x":43,"y":30},{"x":48,"y":33},{"x":43,"y":29},{"x":47,"y":9},{"x":47,"y":11},{"x":33,"y":2},{"x":34,"y":2},{"x":35,"y":2},{"x":36,"y":2},{"x":37,"y":2},{"x":38,"y":2},{"x":39,"y":2},{"x":40,"y":2},{"x":41,"y":2},{"x":32,"y":2},{"x":31,"y":2},{"x":30,"y":2},{"x":29,"y":2},{"x":28,"y":2},{"x":22,"y":2},{"x":21,"y":2},{"x":19,"y":2},{"x":20,"y":2},{"x":43,"y":20},{"x":43,"y":21},{"x":43,"y":23},{"x":43,"y":22},{"x":43,"y":24},{"x":43,"y":25},{"x":43,"y":26},{"x":43,"y":27},{"x":43,"y":28},{"x":43,"y":19},{"x":43,"y":18},{"x":43,"y":17},{"x":43,"y":16},{"x":43,"y":15},{"x":43,"y":14},{"x":43,"y":13},{"x":43,"y":12},{"x":43,"y":11},{"x":46,"y":19},{"x":45,"y":21},{"x":45,"y":19},{"x":44,"y":21},{"x":45,"y":17},{"x":44,"y":17},{"x":46,"y":15},{"x":45,"y":15},{"x":45,"y":13},{"x":44,"y":13},{"x":46,"y":11},{"x":45,"y":11},{"x":46,"y":23},{"x":45,"y":23},{"x":45,"y":25},{"x":44,"y":25},{"x":43,"y":10},{"x":43,"y":35},{"x":44,"y":35},{"x":42,"y":35},{"x":41,"y":35},{"x":43,"y":33},{"x":45,"y":35},{"x":41,"y":33},{"x":47,"y":34},{"x":47,"y":35},{"x":41,"y":31},{"x":41,"y":30},{"x":41,"y":29},{"x":43,"y":2},{"x":43,"y":7},{"x":43,"y":6},{"x":42,"y":2},{"x":43,"y":31},{"x":43,"y":32},{"x":44,"y":33},{"x":45,"y":33},{"x":41,"y":34},{"x":46,"y":35},{"x":4,"y":4},{"x":3,"y":4},{"x":1,"y":8},{"x":1,"y":9},{"x":1,"y":14},{"x":1,"y":15},{"x":8,"y":4},{"x":9,"y":4},{"x":10,"y":4},{"x":11,"y":4},{"x":11,"y":3},{"x":10,"y":3},{"x":9,"y":3},{"x":23,"y":1},{"x":22,"y":1},{"x":21,"y":1},{"x":20,"y":1},{"x":19,"y":1},{"x":18,"y":1},{"x":17,"y":1},{"x":16,"y":1},{"x":15,"y":1},{"x":14,"y":1},{"x":13,"y":1},{"x":12,"y":1},{"x":11,"y":1},{"x":10,"y":1},{"x":37,"y":1},{"x":38,"y":1},{"x":40,"y":1},{"x":41,"y":1},{"x":43,"y":1},{"x":42,"y":1},{"x":39,"y":1},{"x":36,"y":1},{"x":35,"y":1},{"x":34,"y":1},{"x":33,"y":1},{"x":32,"y":1},{"x":31,"y":1},{"x":30,"y":1},{"x":29,"y":1},{"x":13,"y":48},{"x":12,"y":48},{"x":11,"y":48},{"x":10,"y":48},{"x":9,"y":48},{"x":8,"y":48},{"x":7,"y":48},{"x":6,"y":48},{"x":5,"y":48},{"x":4,"y":48},{"x":3,"y":48},{"x":2,"y":48},{"x":1,"y":48},{"x":1,"y":47},{"x":2,"y":47},{"x":3,"y":47},{"x":4,"y":47},{"x":5,"y":47},{"x":6,"y":47},{"x":7,"y":47},{"x":8,"y":47},{"x":9,"y":47},{"x":10,"y":47},{"x":11,"y":47},{"x":12,"y":47},{"x":13,"y":47},{"x":14,"y":47},{"x":15,"y":47},{"x":16,"y":47},{"x":17,"y":47},{"x":18,"y":47},{"x":19,"y":47},{"x":20,"y":47},{"x":21,"y":47},{"x":22,"y":47},{"x":23,"y":47},{"x":24,"y":47},{"x":25,"y":47},{"x":26,"y":47},{"x":27,"y":47},{"x":28,"y":47},{"x":29,"y":47},{"x":30,"y":47},{"x":32,"y":47},{"x":31,"y":47},{"x":31,"y":48},{"x":30,"y":48},{"x":29,"y":48},{"x":28,"y":48},{"x":27,"y":48},{"x":26,"y":48},{"x":25,"y":48},{"x":24,"y":48},{"x":23,"y":48},{"x":22,"y":48},{"x":21,"y":48},{"x":20,"y":48},{"x":19,"y":48},{"x":18,"y":48},{"x":17,"y":48},{"x":16,"y":48},{"x":15,"y":48},{"x":14,"y":48},{"x":15,"y":17},{"x":15,"y":16},{"x":15,"y":15},{"x":15,"y":14},{"x":15,"y":13},{"x":15,"y":12},{"x":15,"y":11},{"x":15,"y":10}]},"road":{"pos":[{"x":8,"y":23},{"x":7,"y":23},{"x":5,"y":19},{"x":23,"y":19},{"x":24,"y":16},{"x":22,"y":22},{"x":23,"y":22},{"x":24,"y":22},{"x":25,"y":22},{"x":26,"y":22},{"x":27,"y":22},{"x":18,"y":24},{"x":22,"y":21},{"x":6,"y":23},{"x":23,"y":20},{"x":22,"y":19},{"x":23,"y":18},{"x":24,"y":19},{"x":22,"y":18},{"x":23,"y":21},{"x":24,"y":17},{"x":24,"y":20},{"x":24,"y":21},{"x":25,"y":24},{"x":24,"y":24},{"x":26,"y":24},{"x":23,"y":24},{"x":27,"y":24},{"x":22,"y":24},{"x":21,"y":24},{"x":19,"y":24},{"x":20,"y":24},{"x":27,"y":23},{"x":21,"y":23},{"x":22,"y":23},{"x":23,"y":23},{"x":24,"y":23},{"x":25,"y":23},{"x":26,"y":23},{"x":10,"y":20},{"x":37,"y":37},{"x":38,"y":36},{"x":39,"y":35},{"x":40,"y":34},{"x":40,"y":33},{"x":40,"y":32},{"x":15,"y":22},{"x":15,"y":21},{"x":14,"y":22},{"x":13,"y":23},{"x":7,"y":19},{"x":8,"y":20},{"x":14,"y":18},{"x":13,"y":19},{"x":14,"y":20},{"x":10,"y":18},{"x":11,"y":19},{"x":12,"y":20},{"x":12,"y":18},{"x":9,"y":21},{"x":7,"y":21},{"x":5,"y":21},{"x":5,"y":22},{"x":6,"y":22},{"x":7,"y":22},{"x":8,"y":22},{"x":9,"y":22},{"x":10,"y":22},{"x":13,"y":22},{"x":13,"y":21},{"x":12,"y":22},{"x":11,"y":22},{"x":9,"y":23},{"x":10,"y":23},{"x":11,"y":23},{"x":12,"y":23},{"x":17,"y":23},{"x":18,"y":23},{"x":19,"y":23},{"x":20,"y":23},{"x":21,"y":22},{"x":20,"y":22},{"x":19,"y":22},{"x":18,"y":22},{"x":17,"y":22},{"x":16,"y":22},{"x":5,"y":23},{"x":25,"y":20},{"x":25,"y":21},{"x":26,"y":21},{"x":26,"y":20},{"x":28,"y":22},{"x":28,"y":23},{"x":28,"y":24},{"x":15,"y":23},{"x":14,"y":23},{"x":16,"y":23},{"x":11,"y":24},{"x":12,"y":24},{"x":13,"y":24},{"x":14,"y":24},{"x":15,"y":24},{"x":16,"y":24},{"x":17,"y":24},{"x":8,"y":18},{"x":9,"y":19},{"x":6,"y":18},{"x":6,"y":20},{"x":7,"y":17},{"x":8,"y":16},{"x":9,"y":15},{"x":10,"y":14},{"x":11,"y":13},{"x":13,"y":13},{"x":12,"y":14},{"x":11,"y":15},{"x":10,"y":16},{"x":9,"y":17},{"x":11,"y":17},{"x":12,"y":16},{"x":13,"y":15},{"x":14,"y":14},{"x":14,"y":16},{"x":13,"y":17},{"x":9,"y":13},{"x":8,"y":14},{"x":7,"y":15},{"x":6,"y":16},{"x":6,"y":14},{"x":7,"y":13},{"x":5,"y":17},{"x":5,"y":15},{"x":11,"y":21},{"x":36,"y":38},{"x":35,"y":38},{"x":34,"y":38},{"x":33,"y":38},{"x":32,"y":37},{"x":31,"y":36},{"x":30,"y":35},{"x":29,"y":34},{"x":28,"y":33},{"x":27,"y":32},{"x":26,"y":31},{"x":25,"y":30},{"x":24,"y":29},{"x":23,"y":28},{"x":22,"y":27},{"x":21,"y":26},{"x":20,"y":25},{"x":19,"y":25},{"x":20,"y":26},{"x":21,"y":27},{"x":22,"y":28},{"x":23,"y":29},{"x":24,"y":30},{"x":25,"y":31},{"x":26,"y":32},{"x":27,"y":33},{"x":28,"y":34},{"x":29,"y":35},{"x":30,"y":36},{"x":31,"y":37},{"x":32,"y":38},{"x":33,"y":39},{"x":34,"y":39},{"x":35,"y":39},{"x":36,"y":39},{"x":37,"y":38},{"x":38,"y":37},{"x":39,"y":36},{"x":40,"y":35},{"x":39,"y":34},{"x":39,"y":33},{"x":39,"y":32},{"x":22,"y":20},{"x":23,"y":16},{"x":22,"y":16},{"x":23,"y":17},{"x":22,"y":17},{"x":21,"y":16},{"x":20,"y":16},{"x":20,"y":15},{"x":21,"y":15},{"x":22,"y":15},{"x":23,"y":15},{"x":24,"y":18},{"x":25,"y":17},{"x":25,"y":18},{"x":16,"y":21},{"x":17,"y":21},{"x":18,"y":21},{"x":27,"y":21},{"x":17,"y":31},{"x":16,"y":32},{"x":15,"y":33},{"x":14,"y":33},{"x":13,"y":33},{"x":12,"y":33},{"x":18,"y":30},{"x":19,"y":29},{"x":19,"y":28},{"x":19,"y":27},{"x":19,"y":26},{"x":20,"y":27},{"x":20,"y":28},{"x":20,"y":29},{"x":19,"y":30},{"x":18,"y":31},{"x":17,"y":32},{"x":16,"y":33},{"x":15,"y":34},{"x":14,"y":34},{"x":13,"y":34},{"x":12,"y":34},{"x":11,"y":32},{"x":11,"y":33}]},"container":{"pos":[{"x":4,"y":21},{"x":4,"y":22},{"x":9,"y":29},{"x":29,"y":23}]},"spawn":{"pos":[{"x":9,"y":20}]},"extension":{"pos":[{"x":14,"y":19},{"x":12,"y":19},{"x":10,"y":19},{"x":8,"y":19},{"x":6,"y":19},{"x":6,"y":17},{"x":8,"y":17},{"x":10,"y":17},{"x":12,"y":17},{"x":14,"y":17},{"x":14,"y":15},{"x":12,"y":15},{"x":10,"y":15},{"x":8,"y":15},{"x":6,"y":15},{"x":6,"y":13},{"x":8,"y":13},{"x":10,"y":13},{"x":12,"y":13},{"x":14,"y":13},{"x":7,"y":18},{"x":7,"y":16},{"x":7,"y":14},{"x":9,"y":14},{"x":9,"y":16},{"x":9,"y":18},{"x":11,"y":18},{"x":11,"y":16},{"x":11,"y":14},{"x":13,"y":14},{"x":13,"y":16},{"x":13,"y":18}]},"tower":{"pos":[{"x":7,"y":20},{"x":13,"y":20},{"x":8,"y":21},{"x":10,"y":21},{"x":29,"y":24}]},"storage":{"pos":[{"x":25,"y":19}]},"link":{"pos":[{"x":15,"y":20},{"x":8,"y":29}]},"terminal":{"pos":[{"x":11,"y":20}]},"extractor":{"pos":[{"x":7,"y":29}]},"observer":{"pos":[{"x":5,"y":20}]},"rampart":{"pos":[{"x":46,"y":10},{"x":45,"y":10},{"x":44,"y":10},{"x":47,"y":10},{"x":44,"y":11},{"x":44,"y":12},{"x":45,"y":12},{"x":46,"y":12},{"x":46,"y":13},{"x":46,"y":14},{"x":45,"y":14},{"x":44,"y":14},{"x":44,"y":15},{"x":44,"y":16},{"x":45,"y":16},{"x":46,"y":16},{"x":46,"y":17},{"x":46,"y":18},{"x":45,"y":18},{"x":44,"y":18},{"x":44,"y":19},{"x":44,"y":20},{"x":45,"y":20},{"x":46,"y":20},{"x":46,"y":21},{"x":46,"y":22},{"x":45,"y":22},{"x":44,"y":22},{"x":44,"y":23},{"x":44,"y":24},{"x":45,"y":24},{"x":46,"y":24},{"x":46,"y":25},{"x":46,"y":26},{"x":45,"y":26},{"x":44,"y":26},{"x":44,"y":27},{"x":44,"y":28},{"x":45,"y":28},{"x":46,"y":28},{"x":46,"y":30},{"x":46,"y":29},{"x":44,"y":30},{"x":44,"y":31},{"x":44,"y":32},{"x":45,"y":32},{"x":46,"y":32},{"x":45,"y":30},{"x":46,"y":34},{"x":46,"y":33},{"x":45,"y":34},{"x":44,"y":34},{"x":43,"y":34},{"x":42,"y":34},{"x":42,"y":33},{"x":42,"y":32},{"x":41,"y":32},{"x":42,"y":31},{"x":42,"y":30},{"x":42,"y":29},{"x":6,"y":13},{"x":6,"y":14},{"x":6,"y":15},{"x":6,"y":16},{"x":6,"y":17},{"x":6,"y":18},{"x":6,"y":19},{"x":6,"y":20},{"x":6,"y":21},{"x":7,"y":21},{"x":8,"y":21},{"x":9,"y":21},{"x":10,"y":21},{"x":11,"y":21},{"x":12,"y":21},{"x":13,"y":21},{"x":14,"y":21},{"x":14,"y":20},{"x":14,"y":19},{"x":14,"y":18},{"x":14,"y":17},{"x":14,"y":16},{"x":14,"y":15},{"x":14,"y":14},{"x":14,"y":13},{"x":13,"y":13},{"x":12,"y":13},{"x":11,"y":13},{"x":10,"y":13},{"x":9,"y":13},{"x":8,"y":13},{"x":7,"y":13},{"x":7,"y":20},{"x":8,"y":20},{"x":9,"y":20},{"x":10,"y":20},{"x":11,"y":20},{"x":12,"y":20},{"x":13,"y":20},{"x":13,"y":19},{"x":12,"y":19},{"x":11,"y":19},{"x":10,"y":19},{"x":9,"y":19},{"x":8,"y":19},{"x":7,"y":19},{"x":7,"y":18},{"x":8,"y":18},{"x":9,"y":18},{"x":10,"y":18},{"x":11,"y":18},{"x":12,"y":18},{"x":13,"y":18},{"x":13,"y":17},{"x":12,"y":17},{"x":11,"y":17},{"x":10,"y":17},{"x":9,"y":17},{"x":8,"y":17},{"x":7,"y":17},{"x":7,"y":16},{"x":8,"y":16},{"x":9,"y":16},{"x":10,"y":16},{"x":11,"y":16},{"x":12,"y":16},{"x":13,"y":16},{"x":13,"y":15},{"x":12,"y":15},{"x":11,"y":15},{"x":10,"y":15},{"x":9,"y":15},{"x":8,"y":15},{"x":7,"y":15},{"x":7,"y":14},{"x":8,"y":14},{"x":9,"y":14},{"x":10,"y":14},{"x":11,"y":14},{"x":12,"y":14},{"x":13,"y":14}]}}}');
            if (buildplan && Object.keys(buildplan).length > 0) {
                utils.loadBuildplan(room, buildplan);
            }


            // 6.Статистика
            if (config.useStats) {

                // Обновление статистики на основе лога событий
                for (const event of eventLog) {
                    switch (event.event) {
                        case EVENT_HARVEST:
                            const target = Game.getObjectById(event.data.targetId);
                            if (target instanceof Source) {
                                utils.addStat(`${roomStatsPath}.energyHarvested`, event.data.amount);
                            } else if (target instanceof Mineral) {
                                utils.addStat(`${roomStatsPath}.mineralsHarvested`, event.data.amount);
                            }
                            break;

                        case EVENT_REPAIR:
                            const energySpentOnRepair = utils.getStat(`${roomStatsPath}.energySpentOnRepair`);
                            utils.addStat(`${roomStatsPath}.energySpentOnRepair`, event.data.energySpent);
                            break;

                        case EVENT_TRANSFER:
                            if (event.data.resourceType === RESOURCE_ENERGY) {
                                const target = Game.getObjectById(event.data.targetId);
                                if (target instanceof StructureController) {
                                    utils.addStat(`${roomStatsPath}.energyDeliveredToController`, event.data.amount);
                                }
                                if (target instanceof StructureSpawn || target instanceof StructureExtension) {
                                    utils.addStat(`${roomStatsPath}.energyDeliveredToExtensions`, event.data.amount);
                                }
                            }
                            break;

                        case EVENT_OBJECT_DESTROYED:
                            if (event.data.type === "creep") {
                                utils.addStat(`${roomStatsPath}.creepsDied`, 1);
                            }
                            break;
                    }
                }

                // Обновление статистики на основе текущего состояния комнаты
                const spawns = room.find(FIND_MY_SPAWNS);
                const extensions = room.find(FIND_MY_STRUCTURES, {
                    filter: {structureType: STRUCTURE_EXTENSION},
                });
                const containers = room.find(FIND_STRUCTURES, {
                    filter: {structureType: STRUCTURE_CONTAINER},
                });

                let energyInSpawns = 0;
                let energyInExtensions = 0;
                let energyInContainers = 0;

                for (const spawn of spawns) {
                    energyInSpawns += spawn.store[RESOURCE_ENERGY];
                }
                for (const extension of extensions) {
                    energyInExtensions += extension.store[RESOURCE_ENERGY];
                }
                for (const container of containers) {
                    energyInContainers += container.store[RESOURCE_ENERGY];
                }

                utils.setStat(`${roomStatsPath}.energyInSpawns`, energyInSpawns);
                utils.setStat(`${roomStatsPath}.energyInExtensions`, energyInExtensions);
                utils.setStat(`${roomStatsPath}.energyInContainers`, energyInContainers);
            }

            if (config.showStats) {
                const energyHarvestedAvg = utils.getAvgStat(`rooms.${roomName}.energyHarvested`);
                const energyHarvestedSum = utils.getSumStat(`rooms.${roomName}.energyHarvested`);
                const mineralsHarvestedAvg = utils.getAvgStat(`rooms.${roomName}.mineralsHarvested`);
                const mineralsHarvestedSum = utils.getSumStat(`rooms.${roomName}.mineralsHarvested`);
                const energyDeliveredToControllerAvg = utils.getAvgStat(`rooms.${roomName}.energyDeliveredToController`);
                const energyDeliveredToControllerSum = utils.getSumStat(`rooms.${roomName}.energyDeliveredToController`);
                const energyDeliveredToExtensionsAvg = utils.getAvgStat(`rooms.${roomName}.energyDeliveredToExtensions`);
                const energyDeliveredToExtensionsSum = utils.getSumStat(`rooms.${roomName}.energyDeliveredToExtensions`);
                const creepsDiedSum = utils.getSumStat(`rooms.${roomName}.creepsDied`);
                const creepsSpawnedSum = utils.getSumStat(`rooms.${roomName}.creepsSpawned`);

                utils.createDebugVisual(room.name, 0, 0,
                    `Energy harvested: ${energyHarvestedSum} (${energyHarvestedAvg}/t)`,
                    `Minerals harvested: ${mineralsHarvestedSum} (${mineralsHarvestedAvg}/t)`,
                    `Energy delivered to controller: ${energyDeliveredToControllerSum} (${energyDeliveredToControllerAvg}/t)`,
                    `Energy delivered to extensions: ${energyDeliveredToExtensionsSum} (${energyDeliveredToExtensionsAvg}/t)`,
                    `Creeps died: ${creepsDiedSum}/t`,
                    `Creeps spawned: ${creepsSpawnedSum}/t`,
                    {align: "left"});
            }
        }
    }
};

module.exports = RoomManager;
