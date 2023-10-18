const config = require('../config');
const utils = require("../utils");

module.exports = {
    roleName: 'repairer',
    memory: {
        default: true,
    },
    settings: {
        minCargoPickup: 0.66,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.building = false;
        }
        if (!creep.memory.building && creep.store.getFreeCapacity() === 0) {
            creep.memory.building = true;
        }

        if (creep.memory.building) {
            //Repair first
            let structsRepair = creep.pos.findInRange(FIND_MY_STRUCTURES, 8, {
                filter: (structure) => {
                    return (
                        structure.hits < structure.hitsMax
                        && structure.structureType !== STRUCTURE_RAMPART
                        && structure.structureType !== STRUCTURE_WALL
                    );
                }
            });
            if (structsRepair.length > 0) {
                structsRepair.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                const topStructs = structsRepair.slice(0, 10);
                const closestStruct = creep.pos.findClosestByRange(topStructs);
                creep.moveToAndPerform(closestStruct, 'repair');
                return;
            }

            // Repair others
            structsRepair = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.hits < structure.hitsMax);
                }
            });
            if (structsRepair.length > 0) {
                structsRepair.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                const topStructs = structsRepair.slice(0, 10);
                const closestStruct = creep.pos.findClosestByRange(topStructs);
                creep.moveToAndPerform(closestStruct, 'repair');
                return;
            }
        } else {
            // Если крип не несет ресурс
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {return (
                    (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE)
                        && structure.store[RESOURCE_ENERGY] > 0
                        );}
            });
            const resources_droped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 8, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount > (creep.store.getFreeCapacity(RESOURCE_ENERGY) * this.settings.minCargoPickup);
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

            // Если ресурсов на карте нет, идем на спавн
            creep.moveTo(config.flagIdle)
        }
    },
    getSuccessRate: function (room) {
        const repairers = room.find(FIND_MY_CREEPS, {filter: {memory: {role: this.roleName}}});
        const damagedStructures = room.find(FIND_MY_STRUCTURES, {
            filter: (structure) => {
                return structure.hits < structure.hitsMax;
            }
        });
        const energyAvailable = _.sum(repairers, (c) => (c.getActiveBodyparts(WORK) * BUILD_POWER));
        const energyNeededForRepairs = _.sum(damagedStructures, (s) => ((s.hitsMax - s.hits)));
        const energyRatio = (energyAvailable / (energyNeededForRepairs + 1)) || 0;
//        console.log(JSON.stringify(repairers.length), energyAvailable, energyNeededForRepairs, energyRatio)

        if (repairers.length === 0) {
            return 0;
        }
        if ((damagedStructures.length === 0)) {
            return repairers.length;
        }

        return Math.max(energyRatio, 0.1);
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