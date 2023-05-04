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
            // Find spawns, extensions or towers and deliver energy to them
            let targets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (
                            structure.structureType === STRUCTURE_EXTENSION
                            || structure.structureType === STRUCTURE_SPAWN
                            || structure.structureType === STRUCTURE_TOWER)
                        && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });
            if (targets.length) {
                creep.moveToAndPerform(creep.pos.findClosestByRange(targets), 'transfer', RESOURCE_ENERGY);
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
                creep.moveToAndPerform(nearestContainer, 'transfer', RESOURCE_ENERGY);
                return;
            } else {
                // Find anything that can have energy capacity
                let targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
                if (targets.length) {
                    creep.moveToAndPerform(creep.pos.findClosestByRange(targets), 'transfer', RESOURCE_ENERGY);
                    return;
                }
            }

        } else {
            // Dropped resources
            let roomDropped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount > 0;
                }
            });
            if (roomDropped.length > 0) {
                let nearest = creep.pos.findClosestByRange(roomDropped);
                creep.moveToAndPerform(nearest, 'pickup');
                return;
            } else {
                if (creep.store[RESOURCE_ENERGY] > 0) {
                    creep.memory.delivering = true;
                } else {
                    let allDropped = [];
                    for (let roomName in Game.rooms) {
                        let room = Game.rooms[roomName];
                        if (!room.controller || !room.controller.my || roomName === creep.room.name) {
                            continue;
                        }
                        console.log(JSON.stringify(room))
                        let roomDropped = room.find(FIND_DROPPED_RESOURCES, {
                            filter: (resource) => {
                                return resource.resourceType === RESOURCE_ENERGY && resource.amount > 0;
                            }
                        });
                        allDropped = allDropped.concat(roomDropped);
                    }
                    if (allDropped.length > 0) {
                        let nearestSource = creep.pos.findClosestByRange(allDropped);
                        console.log(`Hauler found dropped resource in the room ${nearestSource.room.name}`);
                        creep.moveToAndPerform(nearestSource, 'pickup');
                    } else {
                        creep.say('Nothing');
                        creep.moveTo(config.defaultSpawn);
                    }
                }
            }
        }
    },
    getSuccessRate: function (room) {
        const haulers = _.filter(Game.creeps, (creep) => creep.memory.role === 'hauler');
        const resources = _.filter(room.find(FIND_DROPPED_RESOURCES), (resource) => resource.resourceType === RESOURCE_ENERGY);
        const energyDropped = _.sum(resources, (r) => (r.amount));

        if (haulers.length === 0) {
            return 0;
        }
        if (resources.length === 0) {
            return 1;
        }

        return ((haulers.length * (HARVEST_POWER * 100)) / energyDropped) * 32;
        // return ((haulers.length / 2) / resources.length) * (1 - (room.controller.level / 8));
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
