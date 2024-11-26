Object.defineProperty(Source.prototype, 'freeSpaceCount', {
    get: function () {
        if (this._freeSpaceCount == undefined) {
            let freeSpaceCount = 0;
            let freeCells = [];
            const terrain = Game.map.getRoomTerrain(this.pos.roomName);
            [this.pos.x - 1, this.pos.x, this.pos.x + 1].forEach(x => {
                [this.pos.y - 1, this.pos.y, this.pos.y + 1].forEach(y => {
                    if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                        freeSpaceCount++;
                        freeCells.push({ x: x, y: y });
                    }
                });
            });
            this._freeSpaceCount = freeSpaceCount;
            this._freeCells = freeCells;
        }
        return this._freeSpaceCount;
    },
    enumerable: false,
    configurable: true
});

Object.defineProperty(Source.prototype, 'freeCells', {
    get: function () {
        if (this._freeCells == undefined) {
            this.freeSpaceCount;
        }
        return this._freeCells;
    },
    enumerable: false,
    configurable: true
});