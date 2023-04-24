const config = require("./config");

module.exports = {
    roleName: 'defender',
    memory: {
        default: true,
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

        let targetPos = new RoomPosition(25, 25, creep.room.name)
        if (!creep.memory.hasOwnProperty('targetPos')) {
            while (creep.room.getTerrain().get(targetPos.x, targetPos.y, creep.room) !== 0) {
                targetPos = new RoomPosition(Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), creep.room.name);
            }
            creep.memory.targetPos = targetPos;
        } else {
            targetPos = creep.memory.targetPos;
        }

        // creep.say(creep.pos.getRangeTo(targetPos.x, targetPos.y))
        if (creep.pos.getRangeTo(targetPos.x, targetPos.y) > 2) {
            creep.moveTo(targetPos, {visualizePathStyle: {stroke: '#ffaaaa'}});
        } else {
            let newTargetPos = new RoomPosition(Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), creep.room.name);
            while (creep.room.getTerrain().get(newTargetPos.x, newTargetPos.y) !== 0) {
                newTargetPos = new RoomPosition(Math.floor(Math.random() * 50), Math.floor(Math.random() * 50), creep.room.name);
            }
            creep.moveTo(newTargetPos, {visualizePathStyle: {stroke: '#ffaaaa'}});
            creep.memory.targetPos = newTargetPos;
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
