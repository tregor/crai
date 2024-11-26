const config = require('../config');

module.exports = {
    roleName: 'miner',
    memory: {
        sourceId: null,
    },

    /** @param {Creep} creep **/
    run: function (creep) {
        // Получаем источник из памяти
        let source = Game.getObjectById(creep.memory.sourceId);

        if (!source) {
            // Ищем свободный источник энергии или минерал с экстрактором
            source = this.findFreeSource(creep);
            if (source) {
                creep.memory.sourceId = source.id;
            }
        }

        if (source) {
            if (source instanceof Source) {
                // Работа с источником энергии
                if (source.energy > 0) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                } else if (source.ticksToRegeneration <= 300) {
                    // Если источник скоро будет доступен, ждем
                    creep.idleFor(source.ticksToRegeneration);
                } else {
                    // Если долго до восстановления, сбрасываем источник
                    creep.memory.sourceId = null;
                }
            } else if (source instanceof Mineral) {
                // Работа с минералом
                const extractor = source.pos.lookFor(LOOK_STRUCTURES).find(struct => struct.structureType === STRUCTURE_EXTRACTOR);
                if (extractor) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(source);
                    }
                } else {
                    // Если нет экстрактора, сбрасываем минерал
                    creep.memory.sourceId = null;
                }
            }
        }
    },

    findFreeSource: function (creep) {
        // Объединяем списки источников энергии и минералов с доступными экстракторами
        const sources = creep.room.find(FIND_SOURCES).filter(s => s.energy > 0)
            .concat(creep.room.find(FIND_MINERALS).filter(m => {
                const extractor = m.pos.lookFor(LOOK_STRUCTURES).find(struct => struct.structureType === STRUCTURE_EXTRACTOR);
                return extractor && m.mineralAmount > 0;
            }));

        // Ищем первый источник с доступным свободным местом
        return sources.find(source => this.hasFreeSpace(source));
    },

    getSuccessRate: function (room) {
        const miners = _.filter(room.find(FIND_MY_CREEPS), (miner) => miner.memory.role === this.roleName);
        const sources = room.find(FIND_SOURCES).filter(s => s.energy > 0)
            .concat(room.find(FIND_MINERALS).filter(m => m.mineralAmount > 0));

        // Подсчитываем количество доступных позиций вокруг всех источников
        const freePositions = sources.reduce((sum, source) => sum + this.countFreeSpaces(source), 0);

        return (miners.length / Math.min(freePositions, config.minersPerSource));
    },

    hasFreeSpace: function (source) {
        // Проверяем все клетки вокруг источника
        const area = source.room.lookAtArea(
            source.pos.y - 1, source.pos.x - 1,
            source.pos.y + 1, source.pos.x + 1,
            true
        );

        // Ищем клетки, на которых можно стоять
        return area.some(position => position.type === 'terrain' && position.terrain !== 'wall');
    },

    countFreeSpaces: function (source) {
        // Считаем каждую доступную клетку вокруг источника или минерала
        const area = source.room.lookAtArea(
            source.pos.y - 1, source.pos.x - 1,
            source.pos.y + 1, source.pos.x + 1,
            true
        );

        return area.filter(position => position.type === 'terrain' && position.terrain !== 'wall').length;
    },

    /** @param {number} tier **/
    getBody: function (tier) {
        // Конструируем тело крипа на основе уровня
        const body = [];
        const maxPerTick = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME;
        const maxSpeed = Math.ceil(maxPerTick / config.minersPerSource);
        const energy = config.energyPerTiers[tier] - BODYPART_COST[MOVE];
        const workParts = Math.min(Math.floor(energy / BODYPART_COST[WORK]), maxSpeed / HARVEST_POWER);

        body.push(MOVE);
        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }

        return body;
    }
};
