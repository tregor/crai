const config = require('../config');
const utils = require("../utils");

const minClaimSources = 3;
module.exports = {
    roleName: 'scout',
    memory: {
        targetRoom: null, claimRoom: null, claimAllowed: false,
    }, /** @param {Creep} creep **/
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
        if (controller && (controller.owner === undefined)
            //            && (controller.reservation === undefined)
            && (creep.getActiveBodyparts(CLAIM) > 0) && (controller.pos.findInRange(FIND_MY_CREEPS, 1, {filter: (claimer) => claimer.id !== creep.id}).length < 1) && (controller.room.find(FIND_SOURCES).length >= minClaimSources)) {
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
                const creeps = controller.pos.findInRange(FIND_MY_CREEPS, 1, {filter: (claimer) => claimer.id !== creep.id});
                if (creeps.length > 0) {
                    creep.memory.claimRoom = null;
                }
                if (Game.gcl.level < Object.keys(Game.spawns).length + 1) {
                    // Can't claim bcs of GCL

                    const controllerRsrv = creep.room.controller.reservation;
                    if (controllerRsrv === undefined) {
                        creep.say(JSON.stringify(controllerRsrv))
                        creep.moveToAndPerform(controller, 'signController', SIGN_NOVICE_AREA);
                        creep.moveToAndPerform(controller, 'reserveController')
                    } else {
                        if (controllerRsrv.username === 'tregor' && controllerRsrv.ticksToEnd < 3000) {
                            creep.moveToAndPerform(controller, 'reserveController')
                        }
                    }
                } else {
                    if (creep.memory.claimAllowed) {
                        if (creep.claimController(controller) === OK) {
                            creep.memory.claimAllowed = false;
                            creep.memory.claimRoom = null;
                        }
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
        for (const mineral of resources) {
            if (!Memory.stats.seenMinerals[mineral.mineralType]) {
                Memory.stats.seenMinerals[mineral.mineralType] = [];
            }
            if (typeof Memory.stats.seenMinerals[mineral.mineralType].push === 'function') {
                Memory.stats.seenMinerals[mineral.mineralType].push(mineral.pos);
                console.log(`Scout found new mineral: ${mineral.mineralType} at (${mineral.pos.x},${mineral.pos.y})`);
            }
        }

        // Перейти в ближайшую неисследованную комнату или случайную, если все исследованы
        //        Memory.stats.seenRooms[creep.room.name] = true; TODO CACHE
        if ((!creep.memory.targetRoom) || (creep.room.name === creep.memory.targetRoom)) {
            if (!Game.map.describeExits(creep.room.name)) {
                return;
            }

            const unexploredRooms = _.filter(Game.map.describeExits(creep.room.name), (roomName) => !Memory.stats.seenRooms[roomName]);
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
            }
        }
        if (creep.memory.targetRoom) {
            creep.moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), {visualizePathStyle: {stroke: '#ffffff'}});
        }
    }, getSuccessRate: function () {
        return (Game.spawns.length / Game.gcl.level);
        // return 1; // 0.05 means 5% of effecienty
    }, getBody: function (tier) {
        const body = [];
        let energy = config.energyPerTiers[tier];
        body.push(CLAIM);
        energy -= BODYPART_COST[CLAIM];
        if (energy > BODYPART_COST[CLAIM] * 1.2) {
            body.push(CLAIM);
            energy -= BODYPART_COST[CLAIM];
        }
        const bodyMoveCount = Math.floor(energy / BODYPART_COST[MOVE]);
        for (let i = 0; i < bodyMoveCount; i++) {
            body.push(MOVE);
        }

        return body;
    },
};