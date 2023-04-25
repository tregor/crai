const config = require("./config");
module.exports = {
    roleName: 'worker',
    memory: {
        transporting: true,
        action: null,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        // Если крип не переносит ресурс, то попробуем поднять его
        if (creep.memory.transporting && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.transporting = false;
            creep.memory.action = 'loading';
            // creep.say('🔄 loading');
        }
        // Если крип переносит ресурс и полностью загружен, то отнесём его куда нужно
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
            creep.memory.action = 'transporting';
            // creep.say('🚚 deliver');
        }

        // Если крип несет ресурс
        if (creep.memory.transporting) {
            const haulers = creep.room.find(FIND_MY_CREEPS, {
                filter: (hauler) => hauler.memory.role === 'hauler'
            });
            const haulerTargets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (haulers.length < haulerTargets.length) { //If haulers less than targets help haulers
                let nearest = creep.pos.findClosestByRange(haulerTargets);
                if (creep.transfer(nearest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearest, {visualizePathStyle: {stroke: '#ffffff'}});
                }
                return;
            }

            const builders = creep.room.find(FIND_MY_CREEPS, {
                filter: (builder) => builder.memory.role === 'builder'
            });
            if (builders.length < creep.room.find(FIND_CONSTRUCTION_SITES).length) {
                let constructions = [];
                for (let priority of config.constructionSitePriority) {
                    constructions = creep.room.find(FIND_CONSTRUCTION_SITES, {
                        filter: (site) => site.structureType === priority
                    });
                    if (constructions.length > 0) {
                        constructions.sort((a, b) => b.progress - a.progress); // Sort by most progress first
                        let res = creep.build(constructions[0]);
                        if (res === ERR_NOT_IN_RANGE) {
                            creep.moveTo(constructions[0], {visualizePathStyle: {stroke: '#ffffff'}});
                        }
                        return;
                    }
                }
            }

            if ((creep.room.controller.progressTotal - creep.room.controller.progress) > 0) {
                let res = creep.transfer(creep.room.controller, RESOURCE_ENERGY);
                if (res === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
                }
                return;
            }

            // Если ресурсов на карте нет
            creep.moveTo(config.defaultSpawn);
        }
        // Если крип не несет ресурс
        else {
            const resources_droped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount >= creep.store.getFreeCapacity(RESOURCE_ENERGY);
                }
            });
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0);
                }
            });
            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = source.pos.findInRange(FIND_MY_CREEPS, 2, {
                        filter: (miner) => miner.id !== creep.id
                    });
                    const enemies = source.pos.findInRange(FIND_HOSTILE_CREEPS, 4);
                    return miners.length < 3 && enemies.length === 0 && source.energy > 0;
                }
            });
            // Combine the lists of resources, containers, and sources
            const allSources = resources_droped.concat(containers).concat(sources);
            if (allSources.length) {
                // Find the closest source
                const nearest = creep.pos.findClosestByRange(allSources);
                // Move towards the closest source and perform the appropriate action
                if (!creep.pos.isNearTo(nearest)) {
                    creep.moveTo(nearest, {visualizePathStyle: {stroke: '#ffaa00'}});
                } else {
                    if (nearest.amount > 0) {
                        creep.pickup(nearest);
                    } else if (nearest.structureType === STRUCTURE_CONTAINER) {
                        creep.withdraw(nearest, RESOURCE_ENERGY);
                    } else if (nearest.energy > 0) {
                        creep.harvest(nearest);
                    }
                }
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
        this.memory.tier = tier;
        const energy = tier * config.energyPerTier;
        const carryParts = tier;
        const workParts = tier;
        const moveParts = tier;
        const body = [];

        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY);
        }
        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }
        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
        }

        return body;
    }
};