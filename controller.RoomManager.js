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

            // Инициализация объекта статистики для текущего тика
            if (!Memory.stats) {
                Memory.stats = {};
            }
            if (!Memory.stats.ticks) {
                Memory.stats.ticks = {};
            }
            if (!Memory.stats.ticks[Game.time]) {
                Memory.stats.ticks[Game.time] = {
                    rooms: {},
                };
            }
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

            // 5 Статистика
//            return;
            if (config.useStats){

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
                    filter: { structureType: STRUCTURE_EXTENSION },
                });
                const containers = room.find(FIND_STRUCTURES, {
                    filter: { structureType: STRUCTURE_CONTAINER },
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

            if (config.showStats){
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
                                        { align: "left" });
            }
        }
    }
};

function drawRoadUsage(room) {
    const countAccuracy = 148
    const countDetails = 48
    const maxUsage = Math.max(...Object.values(room.memory.roadUsage));
    if (!config.drawRoadMap && !config.drawHeatMap){
        return;
    }

    for (const posKey in room.memory.roadUsage) {
        const [x, y] = posKey.split(",");
        const pos = new RoomPosition(parseInt(x), parseInt(y), room.name);
        const usage = room.memory.roadUsage[posKey];

        // Вычисляем usageRate от 1 до 100
        const usageRate = Math.ceil((usage / maxUsage) * countAccuracy);

        if (config.drawHeatMap){
            // Вычисляем цвет в зависимости от usageRate
            const color = `rgb(${255 * ((usage / maxUsage) * countDetails)}, ${255 - (255 * ((usage / maxUsage) * countDetails))}, 0)`;

            // Отрисовываем прозрачный квадратик на позиции
            room.visual.rect(pos.x-0.5, pos.y-0.5, 1,1, {
                fill: color,
                opacity: 0.2,
            });
        }
        if (config.drawRoadMap){
            if (usageRate <= 1){
                continue;
            }
            room.visual.text(usageRate-1, pos, {
                font: 0.5,
                align: "center",
                opacity: 0.8,
            });
        }
    }
}



module.exports = RoomManager;
