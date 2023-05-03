const config = require('./config');
const creepRoles = require('./roles');

const controllerCreeps = {
    run: function () {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const role = creepRoles[creep.memory.role];

            if (role) {
                role.run(creep);
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
                        console.log(`Creep ${creep.getFullname()} killed in room ${roomName} ` + JSON.stringify(events));
                        // Do something with the information, e.g. add to statistics or send notification
                        delete Memory.creeps[creepName];
                        break; // Once we've found the room, we don't need to continue iterating
                    }
                    if (tombstones.length) {
                        const creep = tombstones[0].creep;
                        console.log(`Creep ${creep.getFullname()} died in room ${roomName}`);
                        // Do something with the information, e.g. add to statistics or send notification
                        delete Memory.creeps[creepName];
                        break; // Once we've found the room, we don't need to continue iterating
                    }
                }
            }
        }
    }
};

Creep.prototype.getFullname = function () {
    if (!this.memory.tier || !this.memory.role) {
        return this.name;
    }
    let role = creepRoles[this.memory.role];
    let labelRole = (role.roleName.charAt(0).toUpperCase() + role.roleName.slice(1));
    return `T${this.memory.tier}${labelRole}`;
}
Creep.prototype.moveToAndPerform = function (target, action, ...args) {
    let res = OK;
    const moveOpts = {
        noPathFinding: (Game.cpu.getUsed() >= 20),
        reusePath: 32,
        visualizePathStyle: {
            fill: undefined,
            opacity: 0.6,
            stroke: '#64ff64',
            strokeWidth: 0.04,
            lineStyle: 'dotted',
        },

        ignoreCreeps: true,
        ignoreDestructibleStructures: false,
        ignoreRoads: false,

        // ignore: [],
        // avoid: [],
        maxOps: 2000,   // CPU /1000
        serialize: false,
        maxRooms: 1,
        range: 0,
        plainCost: 1,
        // swampCost: 5,
        swampCost: 25,
    };

    // this.say(action)
    if (typeof action === 'function') {
        res = action.call(this, target, ...args);
    } else {
        res = this[action](target, ...args);
    }

    if (res === ERR_NOT_IN_RANGE || !this.pos.isNearTo(target)) {
        res = this.moveTo(target, moveOpts);
        if (res === ERR_NOT_FOUND) {
            moveOpts.noPathFinding = false;
            res = this.moveTo(target, moveOpts);
        }
    }
    return res;
};


module.exports = controllerCreeps;
