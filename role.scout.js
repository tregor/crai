const config = require("./config");
const minClaimSources = 1;
module.exports = {
    roleName: 'scout',
    memory: {
        targetRoom: null,
        claimRoom: null,
        claimAllowed: false,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        // Если есть враждебный игрок и крип может получить урон, то убежать
        const hostileCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
        if (hostileCreeps.length) {
            // console.log(JSON.stringify(hostileCreeps))
            // creep.say('RUN!');
            creep.moveTo(config.defaultSpawn);
            return;
        }

        // Если контроллер в комнате не принадлежит никому, то захватить его
        const controller = creep.room.controller;
        if (controller
            && (controller.owner === undefined)
            && (controller.reservation === undefined)
            && (creep.getActiveBodyparts(CLAIM) > 0)
            && (controller.room.find(FIND_SOURCES).length > minClaimSources)
        ) {
            if (!creep.memory.claimRoom) {
                creep.memory.claimRoom = creep.room.name;
                const distance = Game.map.getRoomLinearDistance(config.defaultSpawn.room.name, controller.room.name);
                const sources = controller.room.find(FIND_SOURCES).length;
                const minerals = controller.room.find(FIND_MINERALS).length;
                let textNofitication = `Scout found new room ${controller.room.name} (distance: ${distance}, sources: ${sources}, minerals: ${minerals})`;
                textNofitication += `\nTo claim this controller provide: 'Memory.creeps.${creep.name}.claimAllowed = true'`;
                // Game.notify(textNofitication);
                console.log(textNofitication);
            }

            if (creep.pos.inRangeTo(controller, 1)) {
                if (creep.memory.claimAllowed) {
                    let res = creep.claimController(controller);
                    console.log(res)
                    if (res === OK) {
                        creep.memory.claimAllowed = false;
                        creep.memory.claimRoom = null;
                    }
                }
                return;
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
                // Memory.seenMinerals[resources[mineral].mineralType] TODO save position of every mineral found
                console.log(`Scout found new mineral: ${resources[0].mineralType}`); //TODO: improve text "...in room X with amount Y and so on"
            }
        }

        // Перейти в ближайшую неисследованную комнату или случайную, если все исследованы
        Memory.seenRooms[creep.room.name] = true;
        if (!Game.rooms[creep.memory.targetRoom]) {
            creep.memory.targetRoom = null;
        }
        if ((!creep.memory.targetRoom) || (creep.room.name === creep.memory.targetRoom)) {
            if (!Game.map.describeExits(creep.room.name)) {
                return;
            }

            const unexploredRooms = _.filter(Game.map.describeExits(creep.room.name), (roomName) => !Memory.seenRooms[roomName]);
            if (unexploredRooms.length > 0) {
                creep.memory.targetRoom = _.sample(unexploredRooms);
            } else {
                const rand_x = Math.floor(Math.random() * 48);
                const rand_y = Math.floor(Math.random() * 48);
                const route = Game.map.findRoute(creep.room, `W${rand_x}N${rand_y}`);
                if (route.length > 0) {
                    console.log(creep.name + ' is heading to room ' + route[0].room + ' now');
                    creep.memory.targetRoom = route[0].room;
                    const exit = creep.pos.findClosestByRange(route[0].exit);
                    creep.moveTo(exit);
                }
                // console.log(`random room is ${creep.memory.targetRoom}`)
                // creep.memory.targetRoom = _.sample(Game.map.describeExits(creep.room.name));
            }
        }
        if (creep.memory.targetRoom) {
            // Перейти в целевую комнату
            creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {visualizePathStyle: {stroke: '#ffffff'}});
        }
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