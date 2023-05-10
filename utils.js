const config = require('./config');



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
    const ticks = Array.from({length: currentTick - startTick + 1}, (_, i) => startTick + i);
    const sumStat = ticks.reduce((sum, tick) => {
        return sum + getStat(path, tick);
    }, 0);

    return sumStat;
}


function getAvgStat(path) {
    const currentTick = Game.time;
    const startTick = Math.max(currentTick - config.statsMaxTicks, Math.min(...Object.keys(Memory.stats.ticks)));
    const ticks = Array.from({length: currentTick - startTick + 1}, (_, i) => startTick + i);
    const sumStat = ticks.reduce((sum, tick) => {
        return sum + getStat(path, tick);
    }, 0);

    return (sumStat / config.statsMaxTicks).toFixed(2);
}

function formatETA(seconds) {
    if (seconds === Infinity) {
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
    if (opt.align === "left") {
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
        let textY = rectTopLeftY + padding + (opt.align === "center" ? totalHeight / texts.length / 2 : 0) + (i * opt.font) + (opt.font / 2);
        new RoomVisual(roomName).text(text, textX, textY, opt);
    }
}

/**
 * Convert a plan from https://screeps.admon.dev/building-planner
 * to a 2d matrix
 */
function loadBuildplan(room, plan) {
    const buildlist = {};
    const width = 50;
    const height = 50;
    const matrix = Array.from({length: height}, () =>
        Array.from({length: width}, () => null)
    );

    for (const [structureType, {pos}] of Object.entries(plan)) {
        for (const {x, y} of pos) {
            const structure = MSG_STRUCT[structureType];
            if (!matrix[y][x] || matrix[y][x] !== structure) {
                if (!buildlist[structure]) {
                    buildlist[structure] = [];
                }
                buildlist[structure].push(new RoomPosition(x, y, room.name));
                matrix[y][x] = structure;
            }
        }
    }

    for (const [structType, positions] of Object.entries(buildlist)) {
        for (const pos of positions) {
            const objectsAtPos = pos.lookFor(LOOK_CONSTRUCTION_SITES).concat(pos.lookFor(LOOK_STRUCTURES));
            if (objectsAtPos.length === 0) {
                room.createConstructionSite(pos.x, pos.y, global[structType]);
            }
        }
    }

    return matrix;
}

function drawRoadUsage(room) {
    const countAccuracy = 148
    const countDetails = 64
    const maxUsage = Math.max(...Object.values(room.memory.roadUsage));
    if (!config.drawRoadMap && !config.drawHeatMap) {
        return;
    }

    for (const posKey in room.memory.roadUsage) {
        const [x, y] = posKey.split(",");
        const pos = new RoomPosition(parseInt(x), parseInt(y), room.name);
        const usage = room.memory.roadUsage[posKey];

        // Вычисляем usageRate от 1 до 100
        const usageRate = Math.ceil((usage / maxUsage) * countAccuracy);

        if (config.drawHeatMap) {
            // Вычисляем цвет в зависимости от usageRate
            const color = `rgb(${255 * ((usage / maxUsage) * countDetails)}, ${255 - (255 * ((usage / maxUsage) * countDetails))}, 0)`;

            // Отрисовываем прозрачный квадратик на позиции
            room.visual.rect(pos.x - 0.5, pos.y - 0.5, 1, 1, {
                fill: color,
                opacity: 0.2,
            });
        }
        if (config.drawRoadMap) {
            if (usageRate <= 1) {
                continue;
            }
            room.visual.text(usageRate - 1, pos, {
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
    const visited = new Array(width);

    for (let x = 0; x < width; x++) {
        matrix[x] = new Array(height).fill(Infinity);
        visited[x] = new Array(height).fill(false);
    }

    const queue = [];

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (terrain.get(x, y) === TERRAIN_MASK_WALL) {
                matrix[x][y] = 0;
                visited[x][y] = true;
                queue.push({ x, y });
            }
        }
    }

    const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
        ];

    while (queue.length > 0) {
        const { x, y } = queue.shift();

        for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nx][ny]) {
                matrix[nx][ny] = matrix[x][y] + 1;
                visited[nx][ny] = true;
                queue.push({ x: nx, y: ny });
            }
        }
    }

    const maxDistance = Math.max(...matrix.reduce((acc, row) => acc.concat(row), []));
    const interpolate = (value, min, max) => min + (max - min) * value;
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const pos = new RoomPosition(x, y, room.name);
            const distance = matrix[x][y];
            const normalizedDistance = distance / maxDistance;
            const interpolatedDistance = interpolate(normalizedDistance, 0.2, 1);
            const blueValue = Math.round(interpolatedDistance * 255);
            room.visual.rect(pos.x - 0.5, pos.y - 0.5, 1, 1, {
                fill: `rgba(0, 0, ${blueValue}, 1)`,
                opacity: 0.5,
            });
            room.visual.text(distance.toFixed(1), pos.x, pos.y, {
                font: '0.5 Arial',
                align: 'center',
                color: 'white',
            });
        }
    }
}


/**
 * Simple benchmark test with sanity check
 *
 * Usage: benchmark([
 *		() => doThing(),
 *		() => doThingAnotherWay(),
 * ]);
 *
 * Output:
 *
 * Benchmark results, 1 loop(s):
 * Time: 1.345, Avg: 1.345, Function: () => doThing()
 * Time: 1.118, Avg: 1.118, Function: () => doThingAnotherWay()
 */
function benchmark(arr, iter = 1) {
    var exp,
        r,
        i,
        j,
        len = arr.length;
    var start, end, used;
    var results = _.map(arr, fn => ({ fn: fn.toString(), time: 0, avg: 0 }));
    for (j = 0; j < iter; j++) {
        for (i = 0; i < len; i++) {
            start = Game.cpu.getUsed();
            results[i].rtn = arr[i]();
            used = Game.cpu.getUsed() - start;
            if (i > 0 && results[i].rtn != results[0].rtn)
                throw new Error("Results are not the same!");
            results[i].time += used;
        }
    }
    console.log(`Benchmark results, ${iter} loop(s): `);
    _.each(results, res => {
        res.avg = _.round(res.time / iter, 3);
        res.time = _.round(res.time, 3);
        console.log(`Time: ${res.time}, Avg: ${res.avg}, Function: ${res.fn}`);
    });
}
// Gankdalf 7 December 2016 at 22:35
function calculateCostOfaMine(distance, swampCount, mineCapacity) {
    //Get the number of WORK parts needed
    const energy_generated = mineCapacity / ENERGY_REGEN_TIME;
    const work_needed = energy_generated / HARVEST_POWER;

    //Get the travel time for the creeps
    //(will be used more with non-one-to-one creeps)
    const miner_travel_time = distance;
    const carry_travel_time = distance * 2;

    //Get the number of carry parts needed to move the generated energy in one trip
    //(can in theory be split between multiple creeps)
    const carry_needed = Math.ceil(
        carry_travel_time * (energy_generated / CARRY_CAPACITY)
        );

    //Get the number of move parts needed to move the work and carry parts at 1:1 on roads
    //(including a single work part for the carry creep)
    const work_move_needed = Math.ceil(work_needed / 2);
    const carry_move_needed = Math.ceil((carry_needed + 1) / 2);

    //Get the cost per tick for a container
    const container_cost =
    CONTAINER_DECAY / CONTAINER_DECAY_TIME_OWNED / REPAIR_POWER;

    //Get the one-time energy cost to create the needed needed creeps
    const miner_cost =
    work_needed * BODYPART_COST["work"] +
    work_move_needed * BODYPART_COST["move"];
    const carry_cost =
    carry_needed * BODYPART_COST["carry"] +
    carry_move_needed * BODYPART_COST["move"] +
    BODYPART_COST["work"];

    //Get the cost per-tick to create the needed creeps
    const carry_cost_per_tick =
    carry_cost / (CREEP_LIFE_TIME - carry_travel_time);
    const miner_cost_per_tick =
    miner_cost / (CREEP_LIFE_TIME - miner_travel_time);

    //Get the number of ticks required in a normal creep life cycle required to spawn the needed creeps
    //(This accounts for the time when two miners will exist at the same time for a single source)
    const miner_tick_cost_per_cycle =
    (((work_needed + work_move_needed) * 3) /
      (CREEP_LIFE_TIME - miner_travel_time)) *
    CREEP_LIFE_TIME;
    const carry_tick_cost_per_cycle =
    (((carry_needed + carry_move_needed) * 3) /
      (CREEP_LIFE_TIME - carry_travel_time)) *
    CREEP_LIFE_TIME;

    //Get the repair cost to maintain the roads
    const plain_road_cost =
    ((distance - swampCount) * (ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME)) /
    REPAIR_POWER;
    const swamp_road_cost =
    (swampCount *
      (ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME) *
      CONSTRUCTION_COST_ROAD_SWAMP_RATIO) /
    REPAIR_POWER;

    return {
        totalEnergyCostPerTick:
      Math.round(
          (carry_cost_per_tick +
          miner_cost_per_tick +
          swamp_road_cost +
          plain_road_cost +
          container_cost) *
          100
          ) / 100,
        spawnTicksPerCycle: Math.ceil(
            miner_tick_cost_per_cycle + carry_tick_cost_per_cycle
            ),
        spawnEnergyCapacityRequired: Math.max(miner_cost, carry_cost),
        initialStructureCost:
      (distance - swampCount) * CONSTRUCTION_COST["road"] +
      swampCount *
        CONSTRUCTION_COST["road"] *
        CONSTRUCTION_COST_ROAD_SWAMP_RATIO +
      CONSTRUCTION_COST["container"]
    };
}

global.resetMemory = function(){
    RawMemory.set('{}');
    Memory.creeps = {};
    Memory.rooms = {};
    Memory.flags = {};
    Memory.spawns = {};
}
/**
 * Clear the in-game console
 * Usage: `clear()` in the console
 */
global.clear = function() {
    console.log(
        "<script>angular.element(document.getElementsByClassName('fa fa-trash ng-scope')[0].parentNode).scope().Console.clear()</script>"
        );
};
// warinternal 24 November 2016 at 04:15
global.RAMPART_UPKEEP =
  RAMPART_DECAY_AMOUNT / REPAIR_POWER / RAMPART_DECAY_TIME;
global.ROAD_UPKEEP = ROAD_DECAY_AMOUNT / REPAIR_POWER / ROAD_DECAY_TIME;
global.CONTAINER_UPKEEP =
  CONTAINER_DECAY / REPAIR_POWER / CONTAINER_DECAY_TIME_OWNED;
global.REMOTE_CONTAINER_UPKEEP =
  CONTAINER_DECAY / REPAIR_POWER / CONTAINER_DECAY_TIME;
/**
 * Lookup tables
 */
global.MSG_ERR = _(global)
  .pick((v, k) => k.startsWith("ERR_"))
  .invert()
  .value();

global.MSG_COLOR = _(global)
  .pick((v, k) => k.startsWith("COLOR_"))
  .invert()
  .value();

global.MSG_FIND = _(global)
  .pick((v, k) => k.startsWith("FIND_"))
  .invert()
  .value();

global.MSG_STRUCT = _(global)
  .pick((v, k) => k.startsWith("STRUCTURE_"))
  .invert()
  .value();

global.MSG_RES = _(global)
  .pick((v, k) => k.startsWith("RESOURCE_"))
  .invert()
  .value();

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