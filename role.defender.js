const config = require("./config");

module.exports = {
    roleName: 'defender',
    memory: {
        targetPos: null, // точка финиша маршрута
    },
    run: function (creep) {
        // Определяем противника и ближайшие цели для атаки
        const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        const repairTarget = creep.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.my && structure.hits < structure.hitsMax);
            }
        });
        // Атака
        if (target) {
            if (creep.attack(target) === ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
            }
            return;
        } else if (repairTarget) {
            if (creep.repair(repairTarget) === ERR_NOT_IN_RANGE) {
                creep.moveTo(repairTarget, {visualizePathStyle: {stroke: '#00ff00'}});
            }
            return;
        }

        // Нет врагов, сторожим входы
        if (!creep.memory.exitPos) { // если позиция выхода не установлена, то устанавливаем
            const exits = creep.room.find(FIND_EXIT);
            const exitIndex = Math.floor(Math.random() * exits.length); // выбираем случайный индекс
            // creep.memory.exitPos = exits[exitIndex];
            creep.memory.exitPos = new RoomPosition(exits[exitIndex].x, exits[exitIndex].y, exits[exitIndex].roomName);
        }

        if (creep.pos.getRangeTo(creep.memory.exitPos) > 2) { // если не находимся на позиции выхода, то двигаемся к ней
            creep.moveTo(creep.memory.exitPos, {visualizePathStyle: {stroke: '#ffaaaa'}});
        }
    },
    getSuccessRate: function (room) {
        const enemies = room.find(FIND_HOSTILE_CREEPS);
        const defenders = room.find(FIND_MY_CREEPS, {filter: {memory: {role: 'defender'}}});
        return (defenders.length / (enemies.length + 1));
    },
    getBody: function (tier = 1) {
        let body;
        if (tier <= 2) {
            body = [TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK];
        } else if (tier <= 4) {
            body = [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, ATTACK, RANGED_ATTACK];
        } else {
            body = [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, RANGED_ATTACK, RANGED_ATTACK];
        }

        return body;
    },
};
