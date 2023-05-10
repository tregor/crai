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
            if (!Memory.room) {
                Memory.room = {};
            }
            if (!Memory.room[roomName]) {
                Memory.room[roomName] = {};
            }
            if (!Memory.room[roomName].roadUsage) {
                Memory.room[roomName].roadUsage = {};
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

            if (config.drawDistMap){
                utils.drawDistanceTransform(room)
            }
            if (config.drawRoadMap || config.drawHeatMap){
                utils.drawRoadUsage(room)
            }
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

            // 5. Чтение билд планов из файла:
            const buildplan = JSON.parse('{  "spawn": {    "pos": [      {        "x": 9,        "y": 20      },      {        "x": 5,        "y": 23      },      {        "x": 4,        "y": 22      }    ]  },  "extension": {    "pos": [      {        "x": 6,        "y": 19      },      {        "x": 7,        "y": 18      },      {        "x": 8,        "y": 19      },      {        "x": 9,        "y": 18      },      {        "x": 10,        "y": 19      },      {        "x": 11,        "y": 18      },      {        "x": 12,        "y": 19      },      {        "x": 13,        "y": 18      },      {        "x": 14,        "y": 19      },      {        "x": 5,        "y": 18      },      {        "x": 6,        "y": 17      },      {        "x": 8,        "y": 17      },      {        "x": 10,        "y": 17      },      {        "x": 12,        "y": 17      },      {        "x": 14,        "y": 17      },      {        "x": 13,        "y": 16      },      {        "x": 11,        "y": 16      },      {        "x": 9,        "y": 16      },      {        "x": 7,        "y": 16      },      {        "x": 5,        "y": 16      },      {        "x": 14,        "y": 15      },      {        "x": 12,        "y": 15      },      {        "x": 10,        "y": 15      },      {        "x": 8,        "y": 15      },      {        "x": 6,        "y": 15      },      {        "x": 13,        "y": 14      },      {        "x": 11,        "y": 14      },      {        "x": 9,        "y": 14      },      {        "x": 7,        "y": 14      },      {        "x": 5,        "y": 14      },      {        "x": 4,        "y": 15      },      {        "x": 3,        "y": 14      },      {        "x": 3,        "y": 16      },      {        "x": 2,        "y": 15      },      {        "x": 15,        "y": 14      },      {        "x": 15,        "y": 16      },      {        "x": 16,        "y": 15      },      {        "x": 17,        "y": 16      },      {        "x": 17,        "y": 14      },      {        "x": 15,        "y": 12      },      {        "x": 16,        "y": 13      },      {        "x": 17,        "y": 12      },      {        "x": 14,        "y": 13      },      {        "x": 13,        "y": 12      },      {        "x": 12,        "y": 13      },      {        "x": 11,        "y": 12      },      {        "x": 10,        "y": 13      },      {        "x": 9,        "y": 12      },      {        "x": 8,        "y": 13      },      {        "x": 7,        "y": 12      },      {        "x": 6,        "y": 13      },      {        "x": 5,        "y": 12      },      {        "x": 4,        "y": 13      },      {        "x": 3,        "y": 12      },      {        "x": 2,        "y": 13      },      {        "x": 2,        "y": 11      },      {        "x": 4,        "y": 11      },      {        "x": 6,        "y": 11      },      {        "x": 8,        "y": 11      },      {        "x": 10,        "y": 11      }    ]  },  "container": {    "pos": [      {        "x": 4,        "y": 17      },      {        "x": 12,        "y": 24      },      {        "x": 11,        "y": 24      },      {        "x": 25,        "y": 19      }    ]  },  "road": {    "pos": [      {        "x": 20,        "y": 22      },      {        "x": 20,        "y": 22      },      {        "x": 20,        "y": 23      },      {        "x": 20,        "y": 24      },      {        "x": 19,        "y": 24      },      {        "x": 19,        "y": 24      },      {        "x": 18,        "y": 24      },      {        "x": 17,        "y": 24      },      {        "x": 16,        "y": 24      },      {        "x": 15,        "y": 24      },      {        "x": 14,        "y": 24      },      {        "x": 14,        "y": 24      },      {        "x": 13,        "y": 24      },      {        "x": 19,        "y": 23      },      {        "x": 17,        "y": 23      },      {        "x": 14,        "y": 23      },      {        "x": 10,        "y": 23      },      {        "x": 7,        "y": 23      },      {        "x": 6,        "y": 23      },      {        "x": 5,        "y": 22      },      {        "x": 5,        "y": 21      },      {        "x": 6,        "y": 21      },      {        "x": 6,        "y": 22      },      {        "x": 7,        "y": 21      },      {        "x": 7,        "y": 22      },      {        "x": 8,        "y": 22      },      {        "x": 8,        "y": 21      },      {        "x": 8,        "y": 21      },      {        "x": 9,        "y": 21      },      {        "x": 9,        "y": 22      },      {        "x": 10,        "y": 21      },      {        "x": 10,        "y": 22      },      {        "x": 11,        "y": 21      },      {        "x": 11,        "y": 21      },      {        "x": 12,        "y": 21      },      {        "x": 12,        "y": 22      },      {        "x": 11,        "y": 22      },      {        "x": 14,        "y": 22      },      {        "x": 13,        "y": 21      },      {        "x": 13,        "y": 21      },      {        "x": 14,        "y": 21      },      {        "x": 15,        "y": 21      },      {        "x": 15,        "y": 22      },      {        "x": 16,        "y": 22      },      {        "x": 16,        "y": 21      },      {        "x": 17,        "y": 21      },      {        "x": 17,        "y": 22      },      {        "x": 18,        "y": 21      },      {        "x": 20,        "y": 22      },      {        "x": 18,        "y": 22      },      {        "x": 19,        "y": 22      },      {        "x": 18,        "y": 23      },      {        "x": 17,        "y": 23      },      {        "x": 15,        "y": 23      },      {        "x": 16,        "y": 23      },      {        "x": 13,        "y": 23      },      {        "x": 13,        "y": 22      },      {        "x": 12,        "y": 23      },      {        "x": 11,        "y": 23      },      {        "x": 9,        "y": 23      },      {        "x": 8,        "y": 23      },      {        "x": 5,        "y": 17      },      {        "x": 6,        "y": 19      },      {        "x": 7,        "y": 19      },      {        "x": 6,        "y": 18      },      {        "x": 6,        "y": 20      },      {        "x": 8,        "y": 20      },      {        "x": 5,        "y": 18      },      {        "x": 5,        "y": 19      },      {        "x": 5,        "y": 20      },      {        "x": 7,        "y": 18      },      {        "x": 6,        "y": 17      },      {        "x": 7,        "y": 17      },      {        "x": 8,        "y": 17      },      {        "x": 8,        "y": 18      },      {        "x": 8,        "y": 19      },      {        "x": 8,        "y": 20      }    ]  },  "tower": {    "pos": [      {        "x": 14,        "y": 20      },      {        "x": 13,        "y": 20      },      {        "x": 12,        "y": 20      },      {        "x": 11,        "y": 20      },      {        "x": 10,        "y": 20      },      {        "x": 15,        "y": 20      }    ]  },  "link": {    "pos": [      {        "x": 11,        "y": 32      },      {        "x": 28,        "y": 2      },      {        "x": 5,        "y": 20      }    ]  },  "extractor": {    "pos": [      {        "x": 7,        "y": 29      }    ]  },  "terminal": {    "pos": [      {        "x": 8,        "y": 20      }    ]  },  "lab": {    "pos": [      {        "x": 10,        "y": 30      },      {        "x": 8,        "y": 30      },      {        "x": 9,        "y": 31      },      {        "x": 7,        "y": 31      },      {        "x": 8,        "y": 32      },      {        "x": 10,        "y": 32      },      {        "x": 9,        "y": 29      },      {        "x": 7,        "y": 33      },      {        "x": 9,        "y": 33      },      {        "x": 11,        "y": 33      }    ]  },  "storage": {    "pos": [      {        "x": 4,        "y": 21      }    ]  },  "observer": {    "pos": [      {        "x": 6,        "y": 20      }    ]  },  "powerSpawn": {    "pos": [      {        "x": 7,        "y": 20      }    ]  },  "constructedWall": {    "pos": [      {        "x": 1,        "y": 14      },      {        "x": 1,        "y": 15      },      {        "x": 1,        "y": 8      },      {        "x": 1,        "y": 9      },      {        "x": 3,        "y": 4      },      {        "x": 4,        "y": 4      },      {        "x": 8,        "y": 4      },      {        "x": 9,        "y": 4      },      {        "x": 11,        "y": 4      },      {        "x": 10,        "y": 4      },      {        "x": 11,        "y": 5      },      {        "x": 11,        "y": 7      },      {        "x": 11,        "y": 6      }    ]  }}');
            if (buildplan && buildplan.length > 0){
                utils.loadBuildplan(buildplan);
            }


            // 6.Статистика
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

module.exports = RoomManager;
