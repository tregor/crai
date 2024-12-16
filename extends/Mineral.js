Object.defineProperty(Mineral.prototype, 'freeSpaceCount', {
    get: function () {
        return this.calculateFreeSpaces().freeSpaceCount;
    },
    enumerable: false,
    configurable: true
});

Object.defineProperty(Mineral.prototype, 'freeCells', {
    get: function () {
        return this.calculateFreeSpaces().freeCells;
    },
    enumerable: false,
    configurable: true
});

Mineral.prototype.calculateFreeSpaces = function () {
    let freeSpaceCount = 0;
    let freeCells = [];
    const terrain = Game.map.getRoomTerrain(this.pos.roomName);

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = this.pos.x + dx;
            const y = this.pos.y + dy;
            if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
                const position = new RoomPosition(x, y, this.pos.roomName);
                if (isPositionWalkable(position)) {
                    freeSpaceCount++;
                    freeCells.push(position);
                }
            }
        }
    }

    return { freeSpaceCount, freeCells };
};

function isPositionWalkable(position) {
    return !position.look().some(({ type, structure, constructionSite }) => (
        type === LOOK_CREEPS ||
        (type === LOOK_STRUCTURES && structure && OBSTACLE_OBJECT_TYPES.includes(structure.structureType)) ||
        (type === LOOK_CONSTRUCTION_SITES && constructionSite && OBSTACLE_OBJECT_TYPES.includes(constructionSite.structureType))
    ));
}
