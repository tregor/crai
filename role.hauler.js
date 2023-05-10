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
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (containers.length > 0) {
                let nearestContainer = creep.pos.findClosestByRange(containers);
                creep.moveToAndPerform(nearestContainer, 'transfer', RESOURCE_ENERGY);
                return;
            }

            // Find spawns, extensions or towers and deliver energy to them
            const extensions = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                        structure.structureType === STRUCTURE_EXTENSION
                            || structure.structureType === STRUCTURE_SPAWN)
                        && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (extensions.length) {
                creep.moveToAndPerform(creep.pos.findClosestByRange(extensions), 'transfer', RESOURCE_ENERGY);
                return;
            }


            // Find the nearest storage and transfer energy to it
            const storages = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_STORAGE) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (storages.length > 0) {
                let nearestContainer = creep.pos.findClosestByRange(storages);
                creep.moveToAndPerform(nearestContainer, 'transfer', RESOURCE_ENERGY);
                return;
            }

            // Only towers after spawns
            const towers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                            structure.structureType === STRUCTURE_TOWER)
                        && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (towers.length) {
                creep.moveToAndPerform(creep.pos.findClosestByRange(towers), 'transfer', RESOURCE_ENERGY);
                return;
            }

            // Find anything that can have energy capacity
            const targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (targets.length) {
                creep.moveToAndPerform(creep.pos.findClosestByRange(targets), 'transfer', RESOURCE_ENERGY);
                return;
            }
        } else {
            // Dropped resources
            let roomDropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount > (creep.store.getFreeCapacity(RESOURCE_ENERGY) * 0.2);
                }
            });
            if (roomDropped.length > 0) {
                roomDropped.sort((a, b) => a.amount - b.amount); // Sort by most progress first
                let nearest = creep.pos.findClosestByRange(roomDropped.slice(0, 10));

                creep.moveToAndPerform(nearest, 'pickup');
                return;
            }

            let allDropped = [];
            for (let roomName in Game.rooms) {
                let room = Game.rooms[roomName];
                if (!room.controller || !room.controller.my || roomName === creep.room.name) {
                    continue;
                }
                let roomDropped = room.find(FIND_DROPPED_RESOURCES, {
                    filter: (resource) => {
                        return resource.resourceType === RESOURCE_ENERGY && resource.amount > creep.store.getFreeCapacity(RESOURCE_ENERGY);
                    }
                });
                allDropped = allDropped.concat(roomDropped);
            }
            if (allDropped.length > 0) {
                let nearestSource = creep.pos.findClosestByRange(allDropped);
                console.log(`Hauler found dropped resource in the room ${nearestSource.room.name}`);
                creep.moveToAndPerform(nearestSource, 'pickup');
                return;
            }

            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.memory.delivering = true;
            }
            //Waiting for future tasks
            return;
        }
    },
    getSuccessRate: function (room) {
        const haulers = _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === this.roleName);
        const resources = _.filter(room.find(FIND_DROPPED_RESOURCES), (resource) => resource.resourceType === RESOURCE_ENERGY);
        const energyDropped = _.sum(resources, (r) => (r.amount));
        const roomEnergy = room.energyAvailable / room.energyAvailableCapacity;

        if (energyDropped < 10) {
            return 1;
        }
        if (haulers.length === 0) {
            return 0;
        }

        // return ((haulers.length * (HARVEST_POWER *96)) / energyDropped) /8;
        return ((haulers.length * 4) / resources.length) * roomEnergy;
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
