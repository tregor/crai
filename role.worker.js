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
            creep.say('🔄 loading');
        }
        // Если крип переносит ресурс и полностью загружен, то отнесём его куда нужно
        if (!creep.memory.transporting && creep.store.getFreeCapacity() === 0) {
            creep.memory.transporting = true;
            creep.memory.action = 'transporting';
            creep.say('🚚 deliver');
        }

        // Если крип несет ресурс
        if (creep.memory.transporting) {
            const haulers = creep.room.find(FIND_MY_CREEPS, {
                filter: (hauler) => hauler.memory.role === 'hauler'
            });

            if (haulers.length < 1) { //If count haulers <2 then help haulers
                const targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_EXTENSION ||
                                structure.structureType === STRUCTURE_SPAWN ||
                                structure.structureType === STRUCTURE_TOWER) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
                if (targets.length) {
                    let nearest = creep.pos.findClosestByRange(targets);
                    if (creep.transfer(nearest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(nearest, {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                    return;
                }
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
                        break;
                    }
                }
            }

            if ((creep.room.controller.progressTotal - creep.room.controller.progress) > 0 && creep.room.controller.level < 3) {
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
            let resources_droped = creep.room.find(FIND_DROPPED_RESOURCES, {
                filter: (resource) => {
                    return resource.resourceType === RESOURCE_ENERGY;
                }
            });
            if (resources_droped.length) {
                let nearest = creep.pos.findClosestByRange(resources_droped)
                if (creep.pickup(nearest) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearest, {visualizePathStyle: {stroke: '#ffaa00'}});
                }
            }

            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = source.pos.findInRange(FIND_MY_CREEPS, 2, {
                        filter: (miner) => miner.id !== creep.id
                    });
                    const enemies = source.pos.findInRange(FIND_HOSTILE_CREEPS, 4);
                    return miners.length < 4 && enemies.length === 0 && source.energy > 0;
                }
            });
            if (sources.length) {
                // Найти ближайший источник ресурсов
                const closestSource = creep.pos.findClosestByRange(sources);
                if (creep.harvest(closestSource) === ERR_NOT_IN_RANGE) {
                    let res = creep.moveTo(closestSource, {visualizePathStyle: {stroke: '#ffaa00'}});
                    if (res === ERR_NO_PATH || res === ERR_NOT_FOUND) {
                        creep.moveTo(config.defaultSpawn);
                    }
                }
            } else {
                // Если ресурсов на карте нет, идем на спавн
                creep.moveTo(config.defaultSpawn)
            }
        }
    },
    getSuccessRate: function () {
        const workers = _.filter(Game.creeps, (creep) => creep.memory.role === 'worker');
        const resources = _.filter(Game.spawns.Spawn1.room.find(FIND_DROPPED_RESOURCES));
        const structures = _.filter(Game.spawns.Spawn1.room.find(FIND_MY_CONSTRUCTION_SITES, {filter: (site) => site.progress < site.progressTotal}));


        return (1 - (1 / Math.min(workers.length, 1)));

        // Вычисляем коэффициент успеха.
        const resourceRatio = workers.length / resources.length;
        const structureRatio = workers.length / structures.length;
        let successRate = 1 - (resourceRatio + structureRatio) / 2;
        successRate = Math.min(Math.max(successRate, 0), 1);

        if (workers.length === 0) {
            return 0;
        }
        if (workers.length >= 3) {
            successRate += 1;
        }
        if (structures.length === 0) {
            successRate += 1;
        }

        // Ограничиваем коэффициент успеха в диапазоне от 0 до 1.
        return successRate;
    },
    getBody: function (tier) {
        this.memory.tier = tier;
        const energy = tier * 200;
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