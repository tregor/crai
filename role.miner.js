const config = require("./config");
module.exports = {
    roleName: 'miner',
    memory: {
        sourceId: null,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        //Если крип не в пути к источнику энергии, ищем его и отправляемся туда
        const source = Game.getObjectById(creep.memory.sourceId);
        if (!source) {
            // Looking for free sources in same room
            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = _.filter(Game.creeps, (miner) =>
                        miner.id !== creep.id
                        && miner.memory.role === this.roleName
                        && miner.memory.sourceId === source.id
                    );
                    const enemies = source.room.find(FIND_HOSTILE_CREEPS);
                    return ((miners.length < config.minersPerSource) && (enemies.length === 0) && (source.energy > 0));
                }
            });
            if (sources.length > 0) {
                creep.memory.sourceId = creep.pos.findClosestByRange(sources).id;
                return;
            }

            // Looking in adjacent room
            const adjacentRooms = Game.map.describeExits(creep.room.name);
            for (const roomDirection in adjacentRooms) {
                const roomName = adjacentRooms[roomDirection];
                const room = Game.rooms[roomName];
                if (!room || !Memory.seenRooms[roomName]) {
                    // Room not explored
                    // console.log(`Miner's Room ${roomName} not explored`)
                    creep.moveTo(new RoomPosition(25, 25, roomName));
                    continue;
                }
                const sources = room.find(FIND_SOURCES_ACTIVE, {
                    filter: (source) => {
                        const miners = _.filter(Game.creeps, (miner) =>
                            miner.id !== creep.id
                            && miner.memory.role === this.roleName
                            && miner.memory.sourceId === source.id
                        );
                        const enemies = source.room.find(FIND_HOSTILE_CREEPS);
                        return ((miners.length < config.minersPerSource) && (enemies.length === 0) && (source.energy > 0));
                    }
                });
                console.log(room.name + sources.length)
                if (sources.length > 0) {
                    creep.memory.sourceId = _.sample(sources).id;
                    return;
                } else {
                    creep.memory.sourceId = null;
                }
            }
        } else {
            const miners = source.pos.findInRange(FIND_MY_CREEPS, 2, {
                filter: (miner) =>
                    miner.id !== creep.id
                    && miner.memory.role === this.roleName
                    && miner.memory.sourceId === source.id
            });

            if (miners.length > config.minersPerSource) {
                creep.memory.sourceId = null;
                return;
            }
            if (source.energy > 0 || source.ticksToRegeneration > 300) { //TODO replace 300 with calculated ETA to new mines
                creep.moveToAndPerform(source, 'harvest');
                return;
            } else {
                creep.memory.sourceId = null;
            }
        }
    },
    getSuccessRate: function (room) {
        const workers = _.filter(Game.creeps, (creep) => creep.memory.role === this.roleName);
        const resources = room.find(FIND_SOURCES_ACTIVE);

        return (workers.length / resources.length);
    },
    /** @param {number} tier **/
    getBody: function (tier) {
        const body = [];
        body.push(MOVE); // добавляем всего лишь одну MOVE часть
        const energy = config.energyPerTiers[tier] - BODYPART_COST[MOVE];
        const workParts = Math.floor(energy / BODYPART_COST[WORK]); // увеличиваем количество work частей

        // добавляем части тела в соответствующем порядке
        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }

        return body;
    }
};