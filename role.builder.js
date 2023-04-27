const config = require("./config");

module.exports = {
    roleName: 'builder',
    memory: {
        default: true,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
            // creep.say('🔄 harvest');
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
            // creep.say('🚧 build');
        }

        if (creep.memory.building) {
            let targets = [];
            targets = creep.pos.findInRange(FIND_STRUCTURES, 16, {
                filter: (structure) => {
                    return (structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART);
                }
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                if (creep.repair(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
                return;
            }

            targets = [];
            for (let priority of config.constructionSitePriority) {
                targets = creep.room.find(FIND_CONSTRUCTION_SITES, {
                    filter: (site) => site.structureType === priority
                });
                if (targets.length > 0) {
                    targets.sort((a, b) => b.progress - a.progress); // Sort by most progress first
                    let res = creep.build(targets[0]);
                    if (res === ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                    return;
                }
            }

            targets = [];
            targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.hits < structure.hitsMax);
                }
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                if (creep.repair(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }


            }
        } else {
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

            }
        }
    },
    getSuccessRate: function (room) {
        const builders = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'builder'}}});
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        const damagedStructures = room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.hits < structure.hitsMax;
            }
        });
        const energyAvailable = _.sum(builders, (c) => (c.getActiveBodyparts(WORK) * BUILD_POWER)) * 100;
        const energyNeededForConstructs = _.sum(constructionSites, (s) => CONSTRUCTION_COST[s.structureType]);
        const energyNeededForRepairs = _.sum(damagedStructures, (s) => ((s.hitsMax - s.hits) * REPAIR_COST));
        const energyNeeded = energyNeededForConstructs + energyNeededForRepairs;
        const energyRatio = (energyAvailable / energyNeeded) || 0;
        const objectsRatio = (builders.length * 16) / (constructionSites.length + damagedStructures.length + 1);

        if (builders.length === 0) {
            return 0;
        }
        if ((constructionSites.length === 0) && (damagedStructures.length === 0)) {
            return builders.length;
        }

        return Math.max(objectsRatio, 0.1);
        return Math.max(energyRatio, 0.1);
    },


    /** @param {number} tier **/
    getBody: function (tier) {
        const energy = config.energyPerTiers[tier];
        let workParts = Math.floor((energy - 200) / 150); // определяем количество work частей
        workParts = Math.min(workParts, Math.floor((energy - 200) / 100)); // ограничиваем по количеству carry частей
        workParts = Math.max(workParts, 1); // минимальное количество work частей - 1
        const carryParts = Math.max(Math.ceil((energy - 200 - workParts * 100) / 50), 1); // определяем количество carry частей с учетом минимального набора
        const moveParts = Math.ceil((workParts + carryParts) * 0.5); // определяем количество move частей
        const body = [];

        // добавляем части тела в соответствующем порядке
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