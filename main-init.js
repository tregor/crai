"use strict";
const config = require("config");
const utils = require("utils");
const creepRoles = require("roles");

require('extends/ConstructionSite');
require('extends/Creep');
require('extends/Room');
require('extends/RoomObject');
require('extends/RoomPosition');
require('extends/Source');
require('extends/Mineral');
require('extends/Structure');
require('extends/StructureObserver');


const trafficManager = require('controllers/TrafficManager');
trafficManager.init();

// Инициализация объекта статистики и объкта для текущего тика
if (!Memory.stats) {
    Memory.stats = {};
}
if (!Memory.stats.ticks) {
    Memory.stats.ticks = {};
}
if (!Memory.stats.ticks[Game.time]) {
    //TODO: Создавать не хардкод а дефолтный обьект с заданными ключами
    Memory.stats.ticks[Game.time] = {
        rooms: {},
    };

}
// TODO: Эти статы нужно перенести глубже, например Memory.stats.alltime.seenRooms
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