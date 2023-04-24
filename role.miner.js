const config = require("./config");
module.exports = {
    roleName: 'miner',
    memory: {
        sourceId: null,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        //Если крип не в пути к источнику энергии, ищем его и отправляемся туда
        if (!creep.memory.sourceId) {
            const sources = creep.room.find(FIND_SOURCES_ACTIVE, {
                filter: (source) => {
                    const miners = source.pos.findInRange(FIND_MY_CREEPS, 3, {
                        filter: (miner) => miner.id !== creep.id && miner.memory.role === 'miner'
                    });
                    const enemies = source.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
                    return miners.length < 1 && enemies.length === 0 && source.energy > 0;
                }
            });

            if (sources.length > 0) {
                // Найти ближайший источник ресурсов
                const closestSource = creep.pos.findClosestByRange(sources);
                creep.memory.sourceId = closestSource.id;
            }
        }

        const source = Game.getObjectById(creep.memory.sourceId);
        if (source) {
            //Если крип рядом с источником энергии, начинаем добывать
            if (creep.pos.isNearTo(source)) {
                creep.harvest(source);
            }
            //Иначе двигаемся к источнику
            else {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
    },
    getSuccessRate: function (room) {
        const workers = _.filter(Game.creeps, (creep) => creep.memory.role === 'miner');
        const resources = room.find(FIND_SOURCES_ACTIVE);

        return (workers.length / resources.length);
    },
    /** @param {number} tier **/
    getBody: function (tier) {
        const energy = tier * config.energyPerTier;
        const workParts = Math.floor(energy / 100); // увеличиваем количество work частей
        const body = [];

        // добавляем части тела в соответствующем порядке
        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }
        body.push(MOVE); // добавляем всего лишь одну MOVE часть

        return body;
    }
};