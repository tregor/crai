const config = require("./config");
module.exports = {
    roleName: 'scout',
    memory: {
        targetRoom: null,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        // Перейти в ближайшую неисследованную комнату или случайную, если все исследованы
        if (!creep.memory.targetRoom || creep.room.name === creep.memory.targetRoom) {
            Memory.seenRooms[creep.room.name] = true;
            const unexploredRooms = _.filter(Game.map.describeExits(creep.room.name), (r) => Game.map.getRoomTerrain(r) !== "wall" && !Memory.seenRooms[r.name]);
            if (unexploredRooms.length > 0) {
                creep.memory.targetRoom = _.sample(unexploredRooms);
            } else {
                creep.memory.targetRoom = _.sample(Object.values(Game.map.describeExits(creep.room.name)));
            }
        }
        // Если контроллер в комнате не принадлежит никому, то захватить его
        const controller = creep.room.controller;
        if (controller && !controller.owner && !controller.reservation && creep.store.getFreeCapacity() > 0) {
            if (creep.pos.inRangeTo(controller, 1)) {
                creep.claimController(controller);
            } else {
                creep.moveTo(controller, {visualizePathStyle: {stroke: '#ffffff'}});
                return;
            }
        }
        // Если есть что исследовать, то сделать уведомление и сохранить тип предмета
        const resources = creep.room.find(FIND_MINERALS);
        for (const mineral in resources) {
            if (!Memory.seenMinerals[resources[mineral].mineralType]) {
                Memory.seenMinerals[resources[mineral].mineralType] = true;
                console.log(`Scout found new mineral: ${resources[0].mineralType}`); //TODO: improve text "...in room X with amount Y and so on"
            }
        }

        // Если есть враждебный игрок и крип может получить урон, то убежать
        const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        if (hostileCreeps.length) {
            creep.moveTo(config.defaultSpawn);
            return;
        }
        // Перейти в целевую комнату
        creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {visualizePathStyle: {stroke: '#ffffff'}});
    },
    getSuccessRate: function () {
        return 1; // 0.05 means 5% of effecienty
    },
    getBody: function (tier = 1) {
        const body = [];
        for (let i = 0; i < tier; i++) {
            body.push(WORK);
            body.push(MOVE);
            body.push(MOVE);
            body.push(MOVE);
        }
        return body;
    },
};