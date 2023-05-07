if (!Memory.seenRooms) {
    Memory.seenRooms = {};
}
if (!Memory.seenMinerals) {
    Memory.seenMinerals = {};
}

module.exports = {
    // Глобальные настройки
    defaultSpawn: Game.spawns['Spawn1'],
    flagIdle: Game.flags['FLAG_IDLING'],
    energyPerTier: 200,
    energyPerTiers: {
        1: 200,
        2: 550,
        3: 800,
        4: 1200,
        5: 1800,
    },
    minersPerSource: 1,
    creepsPerTier:
    // [2, 3, 5, 7, 11, 13, 17, 19],
        [1, 2, 4, 6, 9, 13],
    constructionSitePriority: [
        STRUCTURE_LINK,
        STRUCTURE_EXTRACTOR,
        STRUCTURE_LAB,
        STRUCTURE_TERMINAL,
        STRUCTURE_FACTORY,
        STRUCTURE_OBSERVER,
        STRUCTURE_POWER_SPAWN,
        STRUCTURE_NUKER,

        STRUCTURE_TOWER,
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION,

        STRUCTURE_STORAGE,
        STRUCTURE_CONTAINER,

        STRUCTURE_ROAD,
        STRUCTURE_RAMPART,
        STRUCTURE_WALL,
    ],
};
