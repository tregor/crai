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


module.exports = {
    setStat,
    addStat,
    getStat,
    getSumStat,
    getAvgStat,
    formatETA,
    createDebugVisual,
};