require('extends.ConstructionSite');
require('extends.Creep');
require('extends.Room');
require('extends.RoomObject');
require('extends.RoomPosition');
require('extends.Source');
require('extends.Structure');
require('extends.StructureObserver');

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

if (!Memory.stats.seenRooms) {
    Memory.stats.seenRooms = {};
}
if (!Memory.stats.seenMinerals) {
    Memory.stats.seenMinerals = {};
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