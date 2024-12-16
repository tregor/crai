const config = require('../config');

module.exports = {
    roleName: 'miner',
    memory: {
        sourceId: null,
    },

    /** @param {Creep} creep **/
    run: function (creep) {
        if (!creep.memory.sourceId) {
            this.assignSource(creep);
        }

        const source = Game.getObjectById(creep.memory.sourceId);

        if (source) {
            if (source instanceof Source) {
                this.mineEnergySource(creep, source);
            } else if (source instanceof Mineral) {
                this.mineMineralSource(creep, source);
            }
        }
    },

    /** @param {Creep} creep **/
    assignSource: function (creep) {
        const sources = this.getAvailableSources(creep.room);

        for (const source of sources) {
            const minersAssigned = _.filter(Game.creeps, c => c.memory.role === this.roleName && c.memory.sourceId === source.id).length;

            if (minersAssigned < this.countFreeSpaces(source)) {
                creep.memory.sourceId = source.id;
                break;
            }
        }
    },

    /** @param {Room} room **/
    getAvailableSources: function (room) {
        return room.find(FIND_SOURCES).concat(
            room.find(FIND_MINERALS).filter(mineral => mineral.mineralAmount > 0)
        );
    },

    /** @param {Creep} creep
     *  @param {Source} source **/
    mineEnergySource: function (creep, source) {
        if (source.energy > 0) {
            creep.moveToAndPerform(source, 'harvest');
            // creep.drop(RESOURCE_ENERGY);
        } else {
            creep.memory.sourceId = null;
        }
    },

    /** @param {Creep} creep
     *  @param {Mineral} source **/
    mineMineralSource: function (creep, source) {
        const extractor = source.pos.lookFor(LOOK_STRUCTURES).find(struct => struct.structureType === STRUCTURE_EXTRACTOR);

        if (extractor && source.mineralAmount > 0) {
            creep.moveToAndPerform(source, 'harvest');
            // creep.drop(source.mineralType);
        } else {
            creep.memory.sourceId = null;
        }
    },

    /** @param {Source|Mineral} source **/
    countFreeSpaces: function (source) {
        const area = source.room.lookAtArea(
            source.pos.y - 1, source.pos.x - 1,
            source.pos.y + 1, source.pos.x + 1,
            true
        );

        return area.filter(position => position.type === 'terrain' && position.terrain !== 'wall').length;
    },

    getSuccessRate: function (room) {
        const miners = _.filter(room.find(FIND_MY_CREEPS), (creep) => creep.memory.role === this.roleName);
        const sources = room.find(FIND_SOURCES).filter(s => s.energy > 0)
            .concat(room.find(FIND_MINERALS).filter(m => m.mineralAmount > 0));

        const freePositions = sources.reduce((sum, source) => sum + source.freeCells.length, 0);

        return (miners.length / Math.min(freePositions, config.minersPerSource));
    },

    /** @param {number} tier **/
    getBody: function (tier) {
        const body = [];
        const maxSourceYieldPerTick = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME; // const 10
        const maxSpeed = Math.ceil(maxSourceYieldPerTick / config.minersPerSource);
        const energy = config.energyPerTiers[tier];

        const workParts = Math.min(Math.floor(energy / BODYPART_COST[WORK]), maxSpeed / HARVEST_POWER);

        for (let i = 0; i < workParts; i++) {
            body.push(WORK);
        }

        // Добавление только одного MOVE, потому что крип не будет двигаться часто
        body.push(MOVE);

        return body;
    }
};
