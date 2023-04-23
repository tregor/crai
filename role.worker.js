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
            if (haulers.length < 2){ //If count haulers <4 then help haulers
                const targets = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_EXTENSION ||
                                structure.structureType === STRUCTURE_SPAWN ||
                                structure.structureType === STRUCTURE_TOWER) &&
                            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                    }
                });
                if (targets.length > 0) {
                    if (creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                    return;
                }
            }

            const builders = creep.room.find(FIND_MY_CREEPS, {
                filter: (builder) => builder.memory.role === 'builder'
            });
            if (builders.length < 2) {
                let constructions_urgent = creep.room.find(FIND_CONSTRUCTION_SITES, {
                    filter: (construction) => {
                        return construction.structureType === STRUCTURE_EXTENSION ||
                            // construction.structureType === STRUCTURE_EXTENSION ||
                            // construction.structureType === STRUCTURE_EXTENSION ||
                            construction.structureType === STRUCTURE_SPAWN;
                    }
                });
                if (constructions_urgent.length) {
                    // creep.say('BLD URG');
                    let res = creep.build(constructions_urgent[0]);
                    if (res === ERR_NOT_IN_RANGE) {
                        creep.moveTo(constructions_urgent[0], {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                    return;
                }
                let constructions = creep.room.find(FIND_CONSTRUCTION_SITES);
                if (constructions.length) {
                    let res = creep.build(constructions[0]);
                    if (res === ERR_NOT_IN_RANGE) {
                        creep.moveTo(constructions[0], {visualizePathStyle: {stroke: '#ffffff'}});
                    }
                    return;
                }
            }

            if (creep.room.controller.progressTotal > 0 && creep.room.controller.level < 2) {
                if (creep.transfer(creep.room.controller, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
                }
                return;
            }

            // Если ресурсов на карте нет
            creep.moveTo(config.defaultSpawn);
        }
        // Если крип не несет ресурс
        else {
            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = source.pos.findInRange(FIND_MY_CREEPS, 3, {
                        filter: (miner) => miner.id !== creep.id
                    });
                    const enemies = source.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
                    return miners.length < 3 && enemies.length === 0 && source.energy > 0;
                }
            });
            if (sources.length > 0) {
                // Найти ближайший источник ресурсов
                const closestSource = creep.pos.findClosestByRange(sources);
                let res = creep.harvest(closestSource)
                if (res === ERR_NOT_IN_RANGE) {
                    res = creep.moveTo(closestSource, {visualizePathStyle: {stroke: '#ffaa00'}});
                    // console.log(res)
                    if (res === ERR_NO_PATH || res === ERR_NOT_FOUND) {
                        creep.moveTo(config.defaultSpawn);
                    }
                }
            } else {
                // Если ресурсов на карте нет, идем на спавн
                let sources = creep.room.find(FIND_DROPPED_RESOURCES, {
                    filter: (resource) => {
                        return resource.resourceType === RESOURCE_ENERGY;
                    }
                });
                if (sources.length > 0) {
                    if (creep.pickup(sources[0]) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(sources[0], {visualizePathStyle: {stroke: '#ffaa00'}});
                    }
                } else {
                    creep.moveTo(config.defaultSpawn)
                }
            }
        }
    },
    getSuccessRate: function () {
        const workers = _.filter(Game.creeps, (creep) => creep.memory.role === 'worker');
        const resources = _.filter(Game.spawns.Spawn1.room.find(FIND_DROPPED_RESOURCES));
        const structures = _.filter(Game.spawns.Spawn1.room.find(FIND_MY_CONSTRUCTION_SITES, {filter: (site) => site.progress < site.progressTotal}));

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
        return Math.max(workers.length, 1);
    },
    getBody: function (tier) {
        this.memory.tier = tier;
        const body = [];
        for (let i = 0; i < tier; i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    }
};