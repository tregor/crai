const config = require('./config');

if (!Memory.seenRooms) {
    Memory.seenRooms = {};
}
if (!Memory.seenMinerals) {
    Memory.seenMinerals = {};
}
if (!Memory.roadUsage) {
    Memory.roadUsage = {};
}


function setStat(path, value) {
    _.set(Memory.stats.ticks[Game.time], path, value);
}
function addStat(path, value) {
    _.set(Memory.stats.ticks[Game.time], path, getStat(path) + value);
}

function getStat(path, tick = null) {
    if (tick === null) {
        tick = Game.time;
    }
    return _.get(Memory.stats.ticks[tick], path) || 0;
}

function getSumStat(path) {
    const currentTick = Game.time;
    const startTick = Math.max(currentTick - config.statsMaxTicks, Math.min(...Object.keys(Memory.stats.ticks)));
    const ticks = Array.from({ length: currentTick - startTick + 1 }, (_, i) => startTick + i);
    const sumStat = ticks.reduce((sum, tick) => {
        return sum + getStat(path, tick);
        }, 0);

    return sumStat;
}
function getAvgStat(path) {
    const currentTick = Game.time;
    const startTick = Math.max(currentTick - config.statsMaxTicks, Math.min(...Object.keys(Memory.stats.ticks)));
    const ticks = Array.from({ length: currentTick - startTick + 1 }, (_, i) => startTick + i);
    const sumStat = ticks.reduce((sum, tick) => {
        return sum + getStat(path, tick);
        }, 0);

    return (sumStat / config.statsMaxTicks).toFixed(2);
}

function formatETA(seconds) {
    if (seconds === Infinity){
        return 'never';
    }
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else {
        return `${minutes}m`;
    }
}

function createDebugVisual(roomName, x, y, ...texts) {
    const room = Game.rooms[roomName];
    const visual = new RoomVisual(roomName);
    const padding = 0.2;
    let maxWidth = 0;

    let opt = {
        font: 0.2,
        align: "center",
    };
    if (typeof texts[texts.length - 1] === 'object') {
        opt = {...opt, ...texts[texts.length - 1]};
        texts.pop();
    }
    
    visual.getTextWidth = function (text, opts) {
        let fontSize = opts.font || 0.5;
        return text.length * fontSize * 0.4; // approximate width
    };
    let totalHeight = texts.length * opt.font;

    // Calculate the maximum width of all the texts
    for (let text of texts) {
        let textWidth = visual.getTextWidth(text, opt);
        maxWidth = Math.max(maxWidth, textWidth);
    }

    // Add padding to the width and height
    let rectWidth = maxWidth + (2 * padding);
    let rectHeight = totalHeight + (2 * padding);

    // Calculate the coordinates of the top left corner of the rectangle
    let rectTopLeftX = x + (opt.align === "center" ? rectWidth / -2 : 0);
    let rectTopLeftY = y + (opt.align === "center" ? rectHeight / -2 : 0);
    if (opt.align === "left"){
        rectTopLeftX = Math.max(rectTopLeftX, 0)
        rectTopLeftY = Math.max(rectTopLeftY, 0)
        rectTopLeftX -= 0.5;
        rectTopLeftY -= 0.5;
    }
    new RoomVisual(roomName)
        .rect(rectTopLeftX, rectTopLeftY, rectWidth, rectHeight, {fill: 'black', opacity: 0.7});
    

    for (let i = 0; i < texts.length; i++) {
        let text = texts[i];
        let textWidth = visual.getTextWidth(text, opt);
        let textX = rectTopLeftX + padding + (opt.align === "center" ? textWidth / 2 : 0);
        let textY = rectTopLeftY + padding + (opt.align === "center" ? totalHeight / texts.length / 2 : 0) + (i * opt.font) + (opt.font/2);
        new RoomVisual(roomName).text(text, textX, textY, opt);
    }
}

/**
* Convert a plan from https://screeps.admon.dev/building-planner
* to a 2d matrix
*/
function loadBuildplan(plan){
    const xCoordinates = Object.values(plan)
  .flatMap((x) => x.pos)
  .map(({ x }) => x);
    const minX = Math.min(...xCoordinates);
    const maxX = Math.max(...xCoordinates);
    const width = maxX - minX + 1;

    const yCoordinates = Object.values(plan)
  .flatMap(({ pos }) => pos)
  .map(({ y }) => y);
    const minY = Math.min(...yCoordinates);
    const maxY = Math.max(...yCoordinates);
    const height = maxY - minY + 1;

    console.log({ width, height });

    const matrix = Array.from({ length: height }, () =>
  Array.from({ length: width }, () => null)
  );

    for (const [structureType, { pos }] of Object.entries(plan)) {
        for (const { x, y } of pos) {
            // @ts-ignore
            matrix[y - minY][x - minX] = `STRUCTURE_${structureType.toUpperCase()}`;
        }
    }

    return matrix;
}

function drawRoadUsage(room) {
    const countAccuracy = 148
    const countDetails = 64
    const maxUsage = Math.max(...Object.values(room.memory.roadUsage));
    if (!config.drawRoadMap && !config.drawHeatMap){
        return;
    }

    for (const posKey in room.memory.roadUsage) {
        const [x, y] = posKey.split(",");
        const pos = new RoomPosition(parseInt(x), parseInt(y), room.name);
        const usage = room.memory.roadUsage[posKey];

        // Вычисляем usageRate от 1 до 100
        const usageRate = Math.ceil((usage / maxUsage) * countAccuracy);

        if (config.drawHeatMap){
            // Вычисляем цвет в зависимости от usageRate
            const color = `rgb(${255 * ((usage / maxUsage) * countDetails)}, ${255 - (255 * ((usage / maxUsage) * countDetails))}, 0)`;

            // Отрисовываем прозрачный квадратик на позиции
            room.visual.rect(pos.x-0.5, pos.y-0.5, 1,1, {
                fill: color,
                opacity: 0.2,
            });
        }
        if (config.drawRoadMap){
            if (usageRate <= 1){
                continue;
            }
            room.visual.text(usageRate-1, pos, {
                font: 0.5,
                align: "center",
                opacity: 0.8,
            });
        }
    }
}
function drawDistanceTransform(room) {
    const terrain = new Room.Terrain(room.name);
    const width = 50;
    const height = 50;
    const matrix = new Array(width);
    for (let x = 0; x < width; x++) {
        matrix[x] = new Array(height);
        for (let y = 0; y < height; y++) {
            const terrainType = terrain.get(x, y);
            matrix[x][y] = terrainType === TERRAIN_MASK_WALL ? 0 : Infinity;
        }
    }

    // Распространяем волну от стен до свободных клеток
    let wave = 1;
    let changed = true;
    while (changed) {
        changed = false;
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (matrix[x][y] === wave) {
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height && matrix[nx][ny] === Infinity) {
                                matrix[nx][ny] = wave + 1;
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
        wave++;
    }

    // Нормализуем значения Distance-Transform от 0 до 1
    const maxDistance = Math.max(...matrix.reduce((acc, row) => acc.concat(row), []));

//    for (let x = 0; x < width; x++) {
//        for (let y = 0; y < height; y++) {
//            matrix[x][y] /= maxDistance;
//        }
//    }

    // Отрисовываем Distance-Transform на карте
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const pos = new RoomPosition(x, y, room.name);
            const distance = matrix[x][y];
            room.visual.rect(pos.x-0.5, pos.y-0.5, 1, 1, {
                fill: `rgba(0, 0, ${(distance * 255)}, 1)`,
                opacity: 0.5,
            });
        }
    }
}


module.exports = {
    setStat,
    addStat,
    getStat,
    getSumStat,
    getAvgStat,
    formatETA,
    createDebugVisual,
    loadBuildplan,
    drawRoadUsage,
    drawDistanceTransform,
};