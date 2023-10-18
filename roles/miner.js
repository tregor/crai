const config = require('../config');
const utils = require("../utils");

module.exports = {
    roleName: 'miner', memory: {
        sourceId: null,
    }, /** @param {Creep} creep **/
    run: function (creep) {
        //Если крип не в пути к источнику энергии, ищем его и отправляемся туда
        const source = Game.getObjectById(creep.memory.sourceId);
        const sourceRoom = (!source) ? creep.memory.sourceRoom : source.room.name;
        if (!source) {
            // Looking for free sources in same room
            const sources = creep.room.findFreeSources();
            if (sources.length > 0) {
                creep.memory.sourceId = creep.pos.findClosestByRange(sources).id;
            } else {
                // Looking in adjacent rooms
                const adjacentRooms = Game.map.describeExits(creep.room.name);

                for (const roomDirection in adjacentRooms) {
                    const roomName = adjacentRooms[roomDirection];
                    const room = Game.rooms[roomName];

                    // Check if there is a path to the room
                    const path = PathFinder.search(creep.pos, {pos: new RoomPosition(25, 25, roomName)});
                    if (path.incomplete) {
                        console.log(`No path to room ${roomName}`);
                        continue;
                    }

                    if (!room || !Memory.stats.seenRooms[roomName]) {
                        // Room not explored
                        console.log(`Miner's Room ${roomName} not explored`);
                        creep.memory.sourceRoom = roomName;
                        creep.moveTo(new RoomPosition(25, 25, creep.memory.sourceRoom));
                        continue;
                    }

                    // Use observer to look into the room
                    const observer = creep.room.find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_OBSERVER}})[0];
                    if (observer) {
                        let res = observer.observeRoom(roomName);
                        console.log("Observer: " + JSON.stringify(res))
                    }


                    console.log(JSON.stringify(room))
                    const sources = room.findFreeSources();
                    if (sources.length > 0) {
                        console.log('Miner found source in room ', room.name, sources.length);
                        creep.memory.sourceId = _.sample(sources).id;
                        return;
                    } else {
                        creep.memory.sourceId = null;
                    }
                }
            }
        } else {
            const miners = _.filter(Game.creeps, (miner) => miner.memory.role === this.roleName && miner.memory.sourceId === source.id && miner.id !== creep.id);
            if (miners.length > config.minersPerSource) {
                creep.memory.sourceId = null;
                return;
            }
            if (source.energy > 0) {
                creep.moveToAndPerform(source, 'harvest');
            } else {
                //TODO replace 300 with calculated ETA to new mines
                if (source.ticksToRegeneration <= 300) {
                    creep.idleFor(source.ticksToRegeneration);
                } else {
                    creep.memory.sourceId = null;
                }
            }
        }
    }, getSuccessRate: function (room) {
        const miners = _.filter(room.find(FIND_MY_CREEPS), (miner) => miner.memory.role === this.roleName);
        const sources = room.find(FIND_SOURCES_ACTIVE, {
            filter: (source) => {
                const enemies = source.room.find(FIND_HOSTILE_CREEPS);
                return ((enemies.length === 0) && (source.energy > 0));
            }
        });
        if (sources.length === 0) return 1;

        return (miners.length / (sources.length * config.minersPerSource));
    }, /** @param {number} tier **/
    getBody: function (tier) {
        const body = [];
        const maxSpeed = 10; // максимальное скорости добычи 10/тик
        const energy = config.energyPerTiers[tier] - BODYPART_COST[MOVE];
        const workParts = Math.min(Math.floor(energy / BODYPART_COST[WORK]), maxSpeed / 2); // увеличиваем количество work частей, но не превышаем максимальные 10 частей
        // Т.е. скорость здесь будет не больше 5 рабочих частей
        // добавляем части тела в соответствующем порядке
        body.push(MOVE); // добавляем всего лишь одну MOVE часть
        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }

        return body;
    }
};