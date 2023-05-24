const config = require('../config');
const utils = require("../utils");
const roleHauler = require("../roles/hauler");
const roleBuilder = require("../roles/builder");

module.exports = {
    roleName: 'worker',
    memory: {
        transporting: true,
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
            // Charge controller untill LVL 2
            if (creep.room.controller.level < 2) {
                creep.moveToAndPerform(creep.room.controller, 'transfer', RESOURCE_ENERGY);
                return;
            }
            // Do not allow downgrade of controller
            if (creep.room.controller.ticksToDowngrade < 999) {
                creep.moveToAndPerform(creep.room.controller, 'transfer', RESOURCE_ENERGY);
                return;
            }

            // Help haulers
            const haulers = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'hauler'});
            const miners = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'miner'});
            if (roleHauler.getSuccessRate(creep.room) < 0.2 || haulers.length === 0 || miners.length === 0) {
                const nearest = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_EXTENSION ||
                                structure.structureType === STRUCTURE_SPAWN) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
                if (nearest) {
                    creep.say("Hauler");
                    creep.moveToAndPerform(nearest, 'transfer', RESOURCE_ENERGY);
                    return;
                }
            }

            // Help builders
            if (roleBuilder.getSuccessRate(creep.room) < 0.2) {
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

            // Charge controller untill max LVL
            if (creep.room.controller.level < 8) {
                creep.moveToAndPerform(creep.room.controller, 'transfer', RESOURCE_ENERGY);
                return;
            }
            // Если ресурсов на карте нет и контроллер прокачан на максимум
            creep.moveTo(config.defaultSpawn);
        } else {
            // Если крип не несет ресурс
            const haulers = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'hauler'});
            const miners = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'miner'});

            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = source.pos.findInRange(FIND_MY_CREEPS, 2, {
                        filter: (miner) => {miner.id !== creep.id}
                    });
                    return miners.length <= config.minersPerSource && source.energy > 0;
                }
            });
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                        (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE)
                        && structure.store[RESOURCE_ENERGY] > 0
                        );
                }
            });
            const resources_droped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 8, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount > 0;
                }
            });

            if (containers.length) {
                let nearest = creep.pos.findClosestByRange(containers);
                if (creep.moveToAndPerform(nearest, 'withdraw', RESOURCE_ENERGY) === OK) {
                    return;
                }
            }
            if (resources_droped.length) {
                let nearest = creep.pos.findClosestByRange(resources_droped);
                if (creep.moveToAndPerform(nearest, 'pickup', RESOURCE_ENERGY) === OK) {
                    return;
                }
            }
            if (sources.length && (haulers.length === 0 || miners.length === 0)) {
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
            creep.moveTo(config.flagIdle)
        }
    },
    getSuccessRate: function (room) {
        const workers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'worker'}}});
        const numWorkers = workers.length;
        const maxWorkers = config.creepsPerTier[room.controller.level];

        const resources = room.find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}});
        const numResources = resources.length;

        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        const numConstructionSites = constructionSites.length;

        const haulers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'hauler'}}});
        const numHaulers = haulers.length;

        const builders = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'builder'}}});
        const numBuilders = builders.length;

        // Calculate the efficiency of workers in terms of hauling and building
        let haulingEfficiency = 0;
        let buildingEfficiency = 0;

        if (numHaulers > 0) {
            haulingEfficiency = Math.min(numWorkers / numHaulers, 1);
        } else if (numResources > 0) {
            haulingEfficiency = Math.min(numWorkers / numResources, 1);
        } else {
            haulingEfficiency = 1;
        }

        if (numBuilders > 0) {
            buildingEfficiency = Math.min(numWorkers / numBuilders, 1);
        } else if (numConstructionSites > 0) {
            buildingEfficiency = Math.min(numWorkers / numConstructionSites, 1);
        } else {
            buildingEfficiency = 1;
        }

        // Calculate the overall success rate
        const successRate = (haulingEfficiency + buildingEfficiency) / 2;

        // Adjust the success rate based on the number of workers compared to the maximum number of workers
        return Math.min(successRate * (numWorkers / maxWorkers), 1);
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