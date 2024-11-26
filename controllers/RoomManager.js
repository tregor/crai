const config = require('../config');
const utils = require("../utils");
const creepRoles = require('../roles');

// require('../controllers/Tasker');

const RoomManager = {
    run: function () {
        let myRooms = {};
        for (const name in Game.spawns) {
            myRooms[Game.spawns[name].room.name] = Game.spawns[name].room;
        }
        for (const roomName in myRooms) {
            const room = myRooms[roomName];
            const eventLog = room.getEventLog();

            Memory.stats.ticks[Game.time] = {}
            const tickKeys = Object.keys(Memory.stats.ticks);
            if (tickKeys.length > config.statsMaxTicks) {
                const excess = tickKeys.length - config.statsMaxTicks;
                tickKeys.slice(0, excess).forEach(tick => delete Memory.stats.ticks[tick]);
            }
            // Инициализация статистики для текущей комнаты
            const roomStatsPath = `rooms.${roomName}`;
            if (utils.getStat(roomStatsPath) === undefined) {
                utils.setStat(`${roomStatsPath}.energyHarvested`, 0);
                utils.setStat(`${roomStatsPath}.mineralsHarvested`, 0);
                utils.setStat(`${roomStatsPath}.energyDeliveredToController`, 0);
                utils.setStat(`${roomStatsPath}.energyDeliveredToExtensions`, 0);
                utils.setStat(`${roomStatsPath}.energyDeliveredToConstructions`, 0);

                utils.setStat(`${roomStatsPath}.creepsDied`, 0);
                utils.setStat(`${roomStatsPath}.creepsSpawned`, 0);
                utils.setStat(`${roomStatsPath}.energyInSpawns`, 0);
                utils.setStat(`${roomStatsPath}.energyInExtensions`, 0);
                utils.setStat(`${roomStatsPath}.energyInContainers`, 0);
            }


            // Activate SafeMode if it's available and there are hostiles in the room and controller health percentage below config.roomSafeModeLimit
            if (room.hasHostile() && room.controller && room.controller.safeModeAvailable && room.controller.safeModeCooldown === 0 && ((room.controller.hits / room.controller.hitsMax) < config.roomSafeModeLimit)) {
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

            // BuildPlan read and preview
            if (config.buildplannerOn && config.buildplan && Object.keys(config.buildplan).length > 0) {
                utils.loadBuildplan(room, config.buildplan);
            }


            // Parsing statistics from tick events
            for (const event of eventLog) {
                switch (event.event) {
                    default:
                        console.log("Unknown EVENT: "+JSON.stringify(event));
                        break;
                    case EVENT_HARVEST:
                        const target = Game.getObjectById(event.data.targetId);
                        if (target instanceof Source) {
                            utils.addStat(`${roomStatsPath}.energyHarvested`, event.data.amount);
                        } else if (target instanceof Mineral) {
                            utils.addStat(`${roomStatsPath}.mineralsHarvested`, event.data.amount);
                        }
                        break;

                    case EVENT_REPAIR:
                        utils.addStat(`${roomStatsPath}.energySpentOnRepair`, event.data.energySpent);
                        break;

                    case EVENT_TRANSFER:
                        if (event.data.resourceType === RESOURCE_ENERGY) {
                            const object = Game.getObjectById(event.objectId);
                            const target = Game.getObjectById(event.data.targetId);
                            // console.log(object, "---("+event.data.amount+")-->", target)
                            if (target instanceof StructureController) {
                                utils.addStat(`${roomStatsPath}.energyDeliveredToController`, event.data.amount);
                            }
                            if (target instanceof StructureSpawn || target instanceof StructureExtension) {
                                utils.addStat(`${roomStatsPath}.energyDeliveredToExtensions`, event.data.amount);
                            }
                            if (target instanceof Structure) {
                                const pos = new RoomPosition(event.data.x, event.data.y, roomName);
                                const constructionSites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
                                if (constructionSites.length > 0) {
                                    console.log(JSON.stringify(event), JSON.stringify(target), JSON.stringify(constructionSites))
                                    utils.addStat(`${roomStatsPath}.energyDeliveredToConstructions`, event.data.amount);
                                }
                            }
                        }
                        break;

                    case EVENT_OBJECT_DESTROYED:
                        if (event.data.type === "creep") {
                            utils.addStat(`${roomStatsPath}.creepsDied`, 1);
                        }
                        break;

                    case EVENT_UPGRADE_CONTROLLER:
                        utils.addStat(`${roomStatsPath}.energyDeliveredToController`, event.data.energySpent);
                        break;


                    case EVENT_BUILD:
                        utils.addStat(`${roomStatsPath}.energyDeliveredToConstructions`, event.data.energySpent);
                        break;
                }
            }


            // const energyInSpawns = room.find(FIND_MY_SPAWNS).reduce((sum, spawn) => sum + spawn.store[RESOURCE_ENERGY], 0);
            // utils.setStat(`${roomStatsPath}.energyInSpawns`, energyInSpawns);
            //
            // const energyInExtensions = room.find(FIND_MY_STRUCTURES, {
            //     filter: {structureType: STRUCTURE_EXTENSION},
            // }).reduce((sum, extension) => sum + extension.store[RESOURCE_ENERGY], 0);
            // utils.setStat(`${roomStatsPath}.energyInExtensions`, energyInExtensions);
            //
            // const energyInContainers = room.find(FIND_STRUCTURES, {
            //     filter: {structureType: STRUCTURE_CONTAINER},
            // }).reduce((sum, container) => sum + container.store[RESOURCE_ENERGY], 0);
            // utils.setStat(`${roomStatsPath}.energyInContainers`, energyInContainers);

            if (config.showStats) {
                const statPaths = [
                    { path: `energyHarvested`, label: "Energy harvested" },
                    { path: `mineralsHarvested`, label: "Minerals harvested" },
                    { path: `energyDeliveredToController`, label: "Energy delivered to controller" },
                    { path: `energyDeliveredToExtensions`, label: "Energy delivered to extensions" },
                    { path: `energyDeliveredToConstructions`, label: "Energy delivered to constructions" },
                    { path: `creepsDied`, label: "Creeps died" },
                    { path: `creepsSpawned`, label: "Creeps spawned" }
                ];

                const roomStats = statPaths.reduce((stats, {path, label}) => {
                    const statData = utils.getStatData(path, roomName);
                    stats[label] = {
                        sum: statData.sum, avg: statData.avg, values: statData.values,
                    };
                    return stats;
                }, {});

                const debugVisuals = statPaths.map(({label}) => `${label}: ${roomStats[label].sum} (${roomStats[label].avg}/t)`);

                utils.createDebugVisual(room.name, 0, 0, ...debugVisuals, {align: "left"});
            }

            const trafficManager = require('controllers/TrafficManager');
            trafficManager.run(room);
        }
    }
};

module.exports = RoomManager;
