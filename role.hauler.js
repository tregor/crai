const config = require("./config");
module.exports = {
    roleName: 'hauler',
    memory: {
        delivering: true,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.memory.delivering && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.delivering = false;
            creep.say('🔄 harvest');
        }
        if (!creep.memory.delivering && creep.store.getFreeCapacity() === 0) {
            creep.memory.delivering = true;
            creep.say('🚚 deliver');
        }

        if (creep.memory.delivering) {
            // Find spawns, extensions or towers and deliver energy to them
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (targets.length) {
                if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                } else {
                    creep.say(creep.transfer(targets[0], RESOURCE_ENERGY));
                }

                return;
            }

            // Find the nearest container and transfer energy to it
            let containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (containers.length > 0) {
                let nearestContainer = creep.pos.findClosestByRange(containers);
                if (creep.transfer(nearestContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearestContainer, {visualizePathStyle: {stroke: '#ffffff'}});
                }
                return;
            }

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
                    break;
                }
            }

            // Transfer to controller
            if (creep.room.controller.progressTotal > 0) {
                let res = creep.transfer(creep.room.controller, RESOURCE_ENERGY);
                if (res === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
                }

            }
        } else {
            // Dropped resources
            let nearestSource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY;
                }
            });
            if (nearestSource) {
                if (creep.pickup(nearestSource) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearestSource, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            } else {
                creep.moveTo(config.defaultSpawn)
            }
        }
    },
    getSuccessRate: function () {
        const workers = _.filter(Game.creeps, (creep) => creep.memory.role === 'hauler');
        const resources = _.filter(Game.spawns.Spawn1.room.find(FIND_DROPPED_RESOURCES), (resource) => resource.resourceType === RESOURCE_ENERGY);
        if (resources.length === 0) {
            return 1;
        }
        return ((workers.length) / resources.length);
    }
    ,
    /** @param {number} tier **/
    getBody: function (tier) {
        const energy = tier * 200;
        const carryParts = Math.max(Math.ceil((energy - 50) / 100), 1);
        const workParts = Math.max(Math.floor((energy - 50 - carryParts * 50) / 100), 1);
        const moveParts = Math.ceil((workParts + carryParts) / 2);
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

}
