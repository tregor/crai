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
if (!Memory.room) {
    Memory.room = {};
}
if (!Memory.room[roomName]) {
    Memory.room[roomName] = {};
}
if (!Memory.room[roomName].roadUsage) {
    Memory.room[roomName].roadUsage = {};
}