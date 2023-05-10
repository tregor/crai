const config = require("./config");
const roleHauler = require("./role.hauler");
const roleBuilder = require("./role.builder");

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
            const haulers = creep.room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role === 'Hauler'});
            if (roleHauler.getSuccessRate(creep.room) < 0.05 || haulers.length === 0) {
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
            if (roleBuilder.getSuccessRate(creep.room) < 0.05) {
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

            // Charge towers
            const towers = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_TOWER) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY);
                }
            });
            if (towers) {
                creep.say("Tower");
                creep.moveToAndPerform(towers, 'transfer', RESOURCE_ENERGY);
                return;
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
                    return (structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0);
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
                resources_droped.sort((a, b) => a.amount - b.amount); // Sort by most progress first
                let nearest = creep.pos.findClosestByRange(resources_droped.slice(0, 10));
                if (creep.moveToAndPerform(nearest, 'pickup', RESOURCE_ENERGY) === OK) {
                    return;
                }
            }
            if (sources.length) {
                let nearest = creep.pos.findClosestByRange(sources);
                if (creep.moveToAndPerform(nearest, 'harvest', RESOURCE_ENERGY) === OK) {
                    return;
                }
            }
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                creep.memory.transporting = true;
            }

            // Если ресурсов на карте нет, идем на спавн
            creep.moveTo(config.flagIdle)
        }
    },


    getSuccessRate: function (room) {
        const numWorkers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'worker'}}}).length;
        return (numWorkers / config.creepsPerTier[room.controller.level]);

        const numResources = room.find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}}).length;
        const numBuilders = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'builder'}}}).length;
        const numConstructionSites = room.find(FIND_CONSTRUCTION_SITES).length;
        const haulers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'hauler'}}});
        const numHaulers = haulers.length;
        const haulerTargets = room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_EXTENSION ||
                        structure.structureType === STRUCTURE_SPAWN ||
                        structure.structureType === STRUCTURE_TOWER) &&
                    structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            }
        });
        const numHaulerTargets = (haulerTargets.length + numResources) / 2;


        let successRate = 1;
        if (numHaulers < numHaulerTargets && numHaulers > 0) {
            successRate = successRate * (numWorkers / (numHaulerTargets - numHaulers));
        }
        if (numBuilders < numConstructionSites && numBuilders > 0) {
            successRate = successRate * (numWorkers / (numConstructionSites - numBuilders));
        }
        if (numBuilders === 0 || numHaulers === 0) {
            successRate = successRate * (numWorkers / (numResources + numConstructionSites));
        }

        return successRate * 4;

    },
    getBody: function (tier) {
        let body = [];
        let energyRemain = config.energyPerTiers[tier];

        // Рассчитываем количество частей тела для каждого типа
        let workParts = Math.floor(energyRemain / (BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE]));
        let carryParts = workParts;
        let moveParts = workParts;

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