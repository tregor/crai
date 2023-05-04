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
            // Do not allow downgrade of controller
            if (creep.room.controller.ticksToDowngrade < 9999) {
                creep.moveToAndPerform(creep.room.controller, 'transfer', RESOURCE_ENERGY);
                return;
            }

            // Help haulers
            if (roleHauler.getSuccessRate(creep.room) < 0.1) {
                creep.say("Hauler");
                const nearest = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_EXTENSION ||
                                structure.structureType === STRUCTURE_SPAWN) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
                creep.moveToAndPerform(nearest, 'transfer', RESOURCE_ENERGY);
                return;
            }

            // Help builders
            if (roleBuilder.getSuccessRate(creep.room) < 0.1) {
                creep.say("Builder")
                for (let priority of config.constructionSitePriority) {
                    let constructions = creep.room.find(FIND_CONSTRUCTION_SITES, {
                        filter: (site) => site.structureType === priority
                    });
                    if (constructions.length) {
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
            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = source.pos.findInRange(FIND_MY_CREEPS, 2, {
                        filter: (miner) => miner.id !== creep.id
                    });
                    const enemies = source.pos.findInRange(FIND_HOSTILE_CREEPS, 4);
                    return miners.length < (config.minersPerSource + 1) && enemies.length === 0 && source.energy > 0;
                }
            });
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0);
                }
            });
            const resources_droped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 8, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount >= creep.store.getFreeCapacity(RESOURCE_ENERGY);
                }
            });

            if (containers.length) {
                let nearest = creep.pos.findClosestByRange(containers);
                creep.moveToAndPerform(nearest, 'withdraw', RESOURCE_ENERGY);
                return;
            }
            if (resources_droped.length) {
                let nearest = creep.pos.findClosestByRange(resources_droped);
                creep.moveToAndPerform(nearest, 'pickup');
                return;
            }
            if (sources.length) {
                let nearest = creep.pos.findClosestByRange(sources);
                creep.moveToAndPerform(nearest, 'harvest');
                return;
            }

            // Если ресурсов на карте нет, идем на спавн
            creep.moveTo(config.defaultSpawn)
        }
    },
    getSuccessRate: function (room) {
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
        const numWorkers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'worker'}}}).length;

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

        return successRate;

    },
    getBody: function (tier) {
        let body = [];
        let energy = config.energyPerTiers[tier];
        let workParts = 1;
        let carryParts = 1;
        let moveParts = 1;

        // Вычисляем максимальное количество частей для каждого типа
        workParts = Math.min(Math.floor((energy - moveParts * BODYPART_COST[MOVE]) / BODYPART_COST[WORK]), 5);
        carryParts = Math.min(Math.floor((energy - moveParts * BODYPART_COST[MOVE] - workParts * BODYPART_COST[WORK]) / BODYPART_COST[CARRY]), 5);
        moveParts = Math.min(Math.floor((energy - workParts * BODYPART_COST[WORK] - carryParts * BODYPART_COST[CARRY]) / BODYPART_COST[MOVE]), 10);

        // Добавляем части тела в соответствующем порядке
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