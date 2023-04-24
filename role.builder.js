const config = require("./config");

module.exports = {
    roleName: 'builder',
    memory: {
        default: true,
    },
    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
            creep.say('🚧 build');
        }

        if(creep.memory.building) {
            let targets = [];
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
                    break;
                }
            }

            targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL && structure.structureType !== STRUCTURE_RAMPART);
                    // return (structure.hits < structure.hitsMax);
                }
            });
            if (targets.length > 0) {
                targets.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                if(creep.repair(targets[0]) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
        else {
            const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] > 0);
                }
            });
            if(container) {
                if(creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(container, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
            else {
                const energy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                    filter: (resource) => {
                        return (resource.resourceType === RESOURCE_ENERGY && (resource.amount > creep.store.getFreeCapacity(RESOURCE_ENERGY)));
                    }
                });
                if(energy) {
                    if(creep.pickup(energy) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(energy, {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                }
                else {
                    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                    if (source) {
                        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
                        }
                    }
                }
            }
        }
    },
    getSuccessRate: function (room) {
        const numBuilders = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'builder'}}}).length;
        const numSitesToBuild = room.find(FIND_CONSTRUCTION_SITES).length;
        const numDamagedStructures = room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.hits < structure.hitsMax;
            }
        }).length;
        // const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        // const sitesToBuild = _.filter(constructionSites, (s) => s.my && !s.progressTotal);
        // const numSitesToBuild = sitesToBuild.length;

        if (numBuilders === 0) {
            return 0;
        }
        if ((numSitesToBuild === 0) && (numDamagedStructures === 0)) {
            return numBuilders;
        }

        const maxEffort = 100 * numBuilders;
        let effortSpent = 0;
        if (numDamagedStructures > 0) {
            effortSpent += Math.min(maxEffort, numDamagedStructures * REPAIR_POWER * REPAIR_COST);
        }
        if (numSitesToBuild > 0) {
            effortSpent += Math.min(maxEffort - effortSpent, numSitesToBuild * BUILD_POWER * 3000);
        }

        return (Math.min(effortSpent, 1) / maxEffort);
    },

    /** @param {number} tier **/
    getBody: function (tier) {
        const energy = tier * config.energyPerTier;
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