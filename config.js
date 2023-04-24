module.exports = {
    // Глобальные настройки
    defaultSpawn: Game.spawns['Spawn1'],
    energyPerTier: 200,
    energyPerTiers: {
        1: 200,
        2: 550,
        3: 850,
        4: 1200,
        5: 1800,
    },
    constructionSitePriority: [
        STRUCTURE_TOWER,
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION,

        STRUCTURE_STORAGE,
        STRUCTURE_CONTAINER,

        STRUCTURE_RAMPART,
        STRUCTURE_ROAD,
        STRUCTURE_WALL,

        STRUCTURE_LINK,
        STRUCTURE_EXTRACTOR,
        STRUCTURE_OBSERVER,
        STRUCTURE_POWER_SPAWN,
        STRUCTURE_LAB,
        STRUCTURE_TERMINAL,
        STRUCTURE_NUKER,
        STRUCTURE_FACTORY,
    ],
};
