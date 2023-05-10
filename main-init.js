// Инициализация объекта статистики для текущего тика
if (!Memory.stats) {
    Memory.stats = {};
}
if (!Memory.stats.ticks) {
    Memory.stats.ticks = {};
}
if (!Memory.stats.ticks[Game.time]) {
    Memory.stats.ticks[Game.time] = {
        rooms: {},
    };
}

if (!Memory.seenRooms) {
    Memory.seenRooms = {};
}
if (!Memory.seenMinerals) {
    Memory.seenMinerals = {};
}

if (!Memory.rooms) {
    Memory.rooms = {};
}
for (const roomName in Game.rooms) {
    if (!Memory.rooms[roomName]) {
        Memory.rooms[roomName] = {};
    }
    if (!Memory.rooms[roomName].roadUsage) {
        Memory.rooms[roomName].roadUsage = {};
    }
}