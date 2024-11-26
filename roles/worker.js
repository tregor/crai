const config = require('../config');
const utils = require("../utils");
const roleHauler = require("../roles/hauler");
const roleBuilder = require("../roles/builder");

module.exports = {
    roleName: 'worker',
    memory: {
        transporting: true,
    },
    settings: {
        minCargoPickup: 0.01,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
        }
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
        }

        if (creep.memory.transporting) {
            let roomControllable = (creep.room.controller.owner.username == 'tregor')
            if (roomControllable){
                // Charge controller untill LVL 2
                if (creep.room.controller.level < 2) {
                    creep.moveToAndPerform(creep.room.controller, 'upgradeController', RESOURCE_ENERGY);
                    return;
                }
                // Do not allow downgrade of controller
                if (creep.room.controller.ticksToDowngrade < 4200) {
                    creep.moveToAndPerform(creep.room.controller, 'upgradeController', RESOURCE_ENERGY);
                    return;
                }
                // Restore controller after downgrade
                if (creep.room.controller.progress > creep.room.controller.progressTotal) {
                    creep.moveToAndPerform(creep.room.controller, 'upgradeController', RESOURCE_ENERGY);
                    return;
                }
                // Charge controller if nearby
//                if ((creep.pos.getRangeTo(creep.room.controller) <= 4) && (creep.room.controller.level <= 8)) {
//                    creep.moveToAndPerform(creep.room.controller, 'upgradeController', RESOURCE_ENERGY);
//                    return;
//                }
            }


            // Help haulers
            const haulers = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'hauler'});
            const miners = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'miner'});
            if (roleHauler.getSuccessRate(creep.room) < 0.2 || haulers.length === 0 || miners.length === 0) {
                const nearest = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_EXTENSION ||
                                structure.structureType === STRUCTURE_SPAWN
                            )
                            && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
//                            && structure.owner.username === 'tregor'
                            ;

                    }
                });
                if (nearest) {
                    creep.say("Hauler");
                    creep.moveToAndPerform(nearest, 'transfer', RESOURCE_ENERGY);
                    return;
                }
            }

            // Help builders
            const builders = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'builder'});
            if (roleBuilder.getSuccessRate(creep.room) < 0.2 || builders.length === 0) {
                for (let priority of config.constructionSitePriority) {
                    let constructions = creep.room.find(FIND_CONSTRUCTION_SITES, {
                        filter: (site) => site.structureType === priority
                    });
                    if (constructions.length) {
                        creep.say("Builder")
                        constructions.sort((a, b) => b.progress - a.progress);
                        creep.moveToAndPerform(constructions[0], 'build');
                        return;
                    }
                }
            }

            // Find links and fill them
//            const sources = creep.room.find(FIND_SOURCES);
//            const link_miners = sources[0].pos.findInRange(FIND_STRUCTURES, 4, {
//                filter: (structure) => {
//                    return (structure.structureType === STRUCTURE_LINK)
//                        && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
//                }
//            });
//            if (link_miners.length) {
//                creep.moveToAndPerform(creep.pos.findClosestByRange(link_miners), 'transfer', RESOURCE_ENERGY);
//                return;
//            }

            // Charge controller untill max LVL
            if (creep.room.controller.level <= 8 && roomControllable) {
                creep.moveToAndPerform(creep.room.controller, 'upgradeController', RESOURCE_ENERGY);
                return;
            }
            // Если ресурсов на карте нет и контроллер прокачан на максимум
            creep.say('OK');
            creep.moveTo(config.defaultSpawn);
        } else {
            // Если крип не несет ресурс
             const haulers = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'hauler'});
             const miners = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'miner'});

            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                        (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE)
                        && structure.store[RESOURCE_ENERGY] > 0
                        );
                }
            });
            if (containers.length) {
                let nearest = creep.pos.findClosestByRange(containers);
                if (creep.moveToAndPerform(nearest, 'withdraw', RESOURCE_ENERGY) === OK) {
                    return;
                }
            }

            const resources_droped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount > (creep.store.getFreeCapacity(RESOURCE_ENERGY) * this.settings.minCargoPickup);
                }
            });
            if (resources_droped.length) {
                let nearest = creep.pos.findClosestByRange(resources_droped);
                let index = parseInt(creep.id) % resources_droped.length;
                let selfenest = resources_droped[index];
                if (creep.moveToAndPerform(nearest, 'pickup', RESOURCE_ENERGY) === OK) {
                    return;
                }
            }

            // Find links and get from them
            const links = creep.pos.findInRange(FIND_STRUCTURES, 4, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_LINK)
                }
            });
            if (links.length && (creep.pos.getRangeTo(creep.room.controller) <= 4)) {
                const link_controller = creep.room.controller.pos.findClosestByRange(links);
                if (link_controller.store[RESOURCE_ENERGY] > 0){
                    creep.moveToAndPerform(link_controller, 'withdraw', RESOURCE_ENERGY);
                    return;
                }
            }

            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = source.pos.findInRange(FIND_MY_CREEPS, 2, {
                        filter: (miner) => (miner.id !== creep.id)
                    });
                    return miners.length <= config.minersPerSource && source.energy > 0;
                }
            });
            if (sources.length
                 && (haulers.length === 0 || miners.length === 0)
            ) {
                let nearest = creep.pos.findClosestByRange(sources);
                if (creep.moveToAndPerform(nearest, 'harvest', RESOURCE_ENERGY) === OK) {
                    return;
                }
            }

            //If nothing to take but have cargo - go fucking work
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                creep.memory.transporting = true;
            }

            // Если ресурсов на карте нет, идем на спавн
            creep.say('OH');
            creep.moveTo(config.defaultSpawn)
        }
    },
    getSuccessRate: function (room) {
        const workers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'worker'}}});
        return (workers.length / config.creepsPerTier[room.controller.level])
    },
    getBody: function (tier) {
        const body = [];

        // Рассчитываем количество частей тела для каждого типа
        let workParts = tier;
        let carryParts = tier;
        let moveParts = workParts + carryParts;

        // Добавляем части тела в массив body
        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }
        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY);
        }
        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
        }

        return body;
    }

};