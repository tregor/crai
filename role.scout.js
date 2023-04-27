const config = require("./config");
module.exports = {
    roleName: 'scout',
    memory: {
        targetRoom: null,
        claimRoom: null,
        claimAllowed: false,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        // Если контроллер в комнате не принадлежит никому, то захватить его
        const controller = creep.room.controller;
        if (controller
            && (controller.owner === undefined)
            && (controller.reservation === undefined)
            && (creep.getActiveBodyparts(CLAIM) > 0)
            && (controller.room.find(FIND_SOURCES).length > 2)
        ) {
            if (!creep.memory.claimRoom) {
                creep.memory.claimRoom = creep.room.name;
                const distance = Game.map.getRoomLinearDistance(config.defaultSpawn.room.name, controller.room.name);
                const sources = controller.room.find(FIND_SOURCES).length;
                const minerals = controller.room.find(FIND_MINERALS).length;
                let textNofitication = `Scout found new room ${controller.room.name} (distance: ${distance}, sources: ${sources}, minerals: ${minerals})`;
                textNofitication += `\nTo claim this controller provide: 'Memory.creeps.${creep.name}.claimAllowed = true'`;
                Game.notify(textNofitication);
                console.log(textNofitication);
            }

            if (creep.pos.inRangeTo(controller, 1)) {
                if (creep.memory.claimAllowed) {
                    creep.claimController(controller);
                    creep.memory.claimAllowed = false;
                    creep.memory.claimRoom = null;
                }
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
            creep.say('RUN!');
            creep.moveTo(config.defaultSpawn);
            return;
        }

        // Перейти в ближайшую неисследованную комнату или случайную, если все исследованы
        Memory.seenRooms[creep.room.name] = true;
        if ((!creep.memory.targetRoom) || (creep.room.name === creep.memory.targetRoom)) {
            if (!Game.map.describeExits(creep.room.name)) {
                creep.say('No exits!');
                return;
            }

            const unexploredRooms = _.filter(Game.map.describeExits(creep.room.name), (roomName) => !Memory.seenRooms[roomName]);
            if (unexploredRooms.length > 0) {
                creep.memory.targetRoom = _.sample(unexploredRooms);
            } else {
                creep.memory.targetRoom = config.defaultSpawn.name;
            }
        }
        // Перейти в целевую комнату
        creep.say('GO')
        creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {visualizePathStyle: {stroke: '#ffffff'}});
    },
    getSuccessRate: function () {
        return 1; // 0.05 means 5% of effecienty
    },
    getBody: function (tier) {
        let body = [];
        let energy = config.energyPerTiers[tier];
        // console.log(tier, energy)
        body.push(CLAIM);
        energy -= BODYPART_COST[CLAIM];
        // console.log(JSON.stringify(BODYPART_COST[CLAIM]))
        const bodyMoveCount = Math.floor(energy / BODYPART_COST[MOVE]); // увеличиваем количество work частей
        // добавляем части тела в соответствующем порядке
        for (let i = 0; i < bodyMoveCount; i++) {
            body.push(MOVE);
        }

        return body;
    },
};