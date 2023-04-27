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
            // creep.say('🔄 harvest');
        }
        if (!creep.memory.delivering && creep.store.getFreeCapacity() === 0) {
            creep.memory.delivering = true;
            // creep.say('🚚 deliver');
        }

        if (creep.memory.delivering) {
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
                }

                return;
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
                    return resource.resourceType === RESOURCE_ENERGY
                    // && resource.amount >= creep.store.getFreeCapacity(RESOURCE_ENERGY)
                }
            });
            if (nearestSource) {
                if (creep.pickup(nearestSource) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearestSource, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }
        }
    },
    getSuccessRate: function (room) {
        const workers = _.filter(Game.creeps, (creep) => creep.memory.role === 'hauler');
        const resources = _.filter(room.find(FIND_DROPPED_RESOURCES), (resource) => resource.resourceType === RESOURCE_ENERGY);
        if (resources.length === 0) {
            return 1;
        }
        return ((workers.length) / resources.length);
    },
    /** @param {number} tier **/
    getBody: function (tier) {
        const body = [];
        let energy = config.energyPerTiers[tier];

        const carryParts = Math.floor((energy / 2) / BODYPART_COST[CARRY]); // максимальное количество CARRY частей
        const moveParts = Math.ceil((carryParts * 2) / 3); // количество MOVE частей, которые нужны, чтобы сохранить скорость передвижения на уровне 1 клетки в тик
        const maxWeight = carryParts * CARRY_CAPACITY;

        for (let i = 0; i < moveParts; i++) {
            body.push(MOVE);
        }

        for (let i = 0; i < carryParts; i++) {
            body.push(CARRY);
        }

        return body;
    },
}
