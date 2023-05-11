module.exports = {
    // Глобальные настройки
    defaultSpawn: Game.spawns['Spawn1'],
    flagIdle: Game.flags['FLAG_IDLING'],
    showStats: false,
    useStats: true,
    drawRoadMap: false,
    drawHeatMap: false,
    drawDistMap: false,
    roadThreshold: 20000,
    statsMaxTicks: 600,
    energyPerTier: 200,
    towerPercentToAttack: 0.1,
    towerPercentToHeal: 0.2,
    towerPercentToRepair: 0.4,
    towerPercentToRepairAll: 0.8,
    minersPerSource: 1,
    energyPerTiers: {
        1: 200,
        2: 550,
        3: 800,
        4: 1200,
        5: 1800,
    },
    creepsPerTier:
        [1, 2, 3, 5, 7, 11, 13, 17],
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
