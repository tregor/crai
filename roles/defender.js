const config = require('../config');
const utils = require("../utils");

module.exports = {
    roleName: 'defender', memory: {
        targetId: null, // ID врага для атаки
        patrolRoom: null, // Комната для патрулирования
        exitPos: null, // точка финиша маршрута
    }, run: function (creep) {
        // Определяем противника и ближайшие цели для атаки
        // const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

        // Получаем врага для атаки
        let target = Game.getObjectById(creep.memory.targetId);
        if (!target) {
            target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        }
        if (target) {
            creep.memory.targetId = target.id;
            this.attackTarget(creep, target);
            return;
        } else {
            creep.memory.targetId = null;
        }

        // Если нет врага, патрулируем комнату
        if (creep.memory.patrolRoom) {
            const exits = Game.map.describeExits(creep.room.name);
            if (creep.room.name !== creep.memory.patrolRoom) {
                // Патрулируем комнату
                const exitDir = creep.room.findExitTo(creep.memory.patrolRoom);
                const exit = creep.pos.findClosestByRange(exitDir);
                creep.moveTo(exit);
            } else {
                // Возвращаемся на изначальную позицию
                const pos = new RoomPosition(creep.memory.exitPos.x, creep.memory.exitPos.y, creep.memory.patrolRoom);
                if (!creep.pos.isEqualTo(pos)) {
                    creep.moveTo(pos);
                }
            }
        }

        // Нет врагов, сторожим входы
        // if (!creep.memory.exitPos) { // если позиция выхода не установлена, то устанавливаем
        //     const exits = creep.room.find(FIND_EXIT);
        //     const exitIndex = Math.floor(Math.random() * exits.length); // выбираем случайный индекс
        //     // creep.memory.exitPos = new RoomPosition(exits[exitIndex].x, exits[exitIndex].y, exits[exitIndex].roomName);
        //     creep.memory.exitPos = new RoomPosition(exits[exitIndex].x, exits[exitIndex].y, creep.room.name);
        //     if (exits.length === 1) {
        //         creep.memory.exitPos = new RoomPosition(25, 25, exits[exitIndex].roomName);
        //     }
        // }
        // if (creep.memory.exitPos && (creep.pos.getRangeTo(creep.memory.exitPos.x, creep.memory.exitPos.y) > 2)) { // если не находимся на позиции выхода, то двигаемся к ней
        //     creep.moveTo(creep.memory.exitPos.x, creep.memory.exitPos.y, {visualizePathStyle: {stroke: '#ffaaaa'}});
        // }

    }, getSuccessRate: function (room) {
        const enemies = room.find(FIND_HOSTILE_CREEPS);
        const defenders = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'defender'}}});
        if (!room.hasHostile()) return 1;
        return (defenders.length / (enemies.length + 1));
    }, getBody: function (tier = 1) {
        let body = [];
        if (tier <= 2) {
            body = [TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK];
        } else if (tier <= 4) {
            body = [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, ATTACK, RANGED_ATTACK];
        } else {
            body = [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, RANGED_ATTACK, RANGED_ATTACK];
        }

        return body;
    }, attackTarget: function (creep, target) {
        const range = creep.pos.getRangeTo(target);
        if (range <= 1) {
            creep.attack(target);
        } else if (range <= 3) {
            creep.rangedAttack(target);
        } else {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
        }
    }
};
