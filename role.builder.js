const config = require("./config");
const {defaultSpawn} = require("./config");

module.exports = {
    roleName: 'builder',
    memory: {
        default: true,
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
            // Constructing
            for (let priority of config.constructionSitePriority) {
                let structsConstruct = creep.room.find(FIND_CONSTRUCTION_SITES, {
                    filter: (site) => site.structureType === priority
                });
                if (structsConstruct.length > 0) {
                    structsConstruct.sort((a, b) => b.progress - a.progress); // Sort by most progress first
                    const topStructs = structsConstruct.slice(0, 10);
                    const closestStruct = creep.pos.findClosestByRange(topStructs);
                    creep.moveToAndPerform(closestStruct, 'build');
                    return;
                }
            }

            // Repair others
            const structsRepair = creep.room.find(FIND_STRUCTURES, {
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
            const resources_droped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY && resource.amount >= creep.store.getFreeCapacity(RESOURCE_ENERGY);
                }
            });
            const containers = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER && structure.store[RESOURCE_ENERGY] >= creep.store.getFreeCapacity(RESOURCE_ENERGY));
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

            creep.moveTo(config.flagIdle)
        }
    },
    getSuccessRate: function (room) {
        const builders = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'builder'}}});
        const constructionSites = room.find(FIND_CONSTRUCTION_SITES);
        const energyAvailable = _.sum(builders, (c) => (c.getActiveBodyparts(WORK) * BUILD_POWER)) * 2560;
        const energyNeededForConstructs = _.sum(constructionSites, (s) => CONSTRUCTION_COST[s.structureType]);
        const energyRatio = (energyAvailable / energyNeededForConstructs) || 0;

        if (builders.length === 0) {
            return 0;
        }
        if ((constructionSites.length === 0)) {
            return builders.length;
        }

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