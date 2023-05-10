const config = require('./config');
const utils = require("./utils");
const creepRoles = require('./roles');


require('extends.ConstructionSite');
require('extends.Creep');
require('extends.Room');
require('extends.RoomPosition');
require('extends.Structure');

const controllerCreeps = {
    run: function () {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const role = creepRoles[creep.memory.role];

            if (role) {
                role.run(creep);
            }

            if( creep.spawning) continue;
            if (creep.ticksToLive === 1) {
                creep.say('☠️ dying');
//                 console.log(`${creep} ${creep.pos} died naturally.`);
                for(const resourceType in creep.carry) {
                    creep.drop(resourceType);
                }
                delete Memory.creeps[creep.name];
            }
        }
        for (const creepName in Memory.creeps) {
            if (!(creepName in Game.creeps)) {
                for (const roomName in Game.rooms) {
                    const room = Game.rooms[roomName];
                    const tombstones = room.find(FIND_TOMBSTONES, {filter: {creep: {name: creepName}}});
                    const events = room.getEventLog().filter(event => event.event === EVENT_OBJECT_DESTROYED && event.data && event.data.type === 'creep' && event.data.creep === creepName);

                    if (events.length) {
                        const creep = Game.getObjectById(events[0].objectId)
                        console.log(JSON.stringify(creep));
                        console.log(`${creep.getFullname()} killed in room ${roomName} ` + JSON.stringify(events));
                        // Do something with the information, e.g. add to statistics or send notification
                        delete Memory.creeps[creepName];
                        break; // Once we've found the room, we don't need to continue iterating
                    }
                    if (tombstones.length) {
                        const creep = tombstones[0].creep;
                        console.log(`${creep.getFullname()} died in room ${roomName}`);
                        // Do something with the information, e.g. add to statistics or send notification
                        delete Memory.creeps[creepName];
                        break; // Once we've found the room, we don't need to continue iterating
                    }
                }
            }
        }
    }
};

module.exports = controllerCreeps;
