const config = require('../config');
const utils = require("../utils");
const creepRoles = require('../roles');

/**
 * Globally patch creep actions to log error codes.
 */

["attack", "attackController", "build", "claimController", "dismantle", "drop", "generateSafeMode", "harvest", "heal", "move", "moveByPath", "moveTo", "pickup", "rangedAttack", "rangedHeal", "rangedMassAttack", "repair", "reserveController", "signController", "suicide", "transfer", "upgradeController", "withdraw"].forEach(function (method) {
    let original = Creep.prototype[method];
    // Magic
    Creep.prototype[method] = function () {
        let status = original.apply(this, arguments);
        if (typeof status === "number" && status < 0) {
             // console.log(`${this.name}.${method}(` + Array.from(arguments).join(", ") + `) failed: ${MSG_ERR[status]} at ${this.pos}`);
        }
        return status;
    };
});

/**
 * Set the unit to idle-mode for ticks given
 *
 * @type {int}
 */
if (typeof Creep.prototype.idleFor !== 'function') {
    Object.defineProperty(Creep.prototype, "idle", {
        get: function () {
            if (this.memory.idle === undefined) return 0;
            if (this.memory.idle <= Game.time) {
                this.idle = undefined;
                return 0;
            }
            return this.memory.idle;
        }, set: function (val) {
            if (!val && this.memory.idle) {
                delete this.memory.idle;
            } else {
                this.memory.idle = val;
            }
        }
    });
    Creep.prototype.idleFor = function (ticks = 0) {
        if (ticks > 0) {
            this.idle = Game.time + ticks;
        } else {
            this.idle = undefined;
        }
    };
}

/**
 * Creep method optimizations "getActiveBodyparts"
 */
Creep.prototype.getActiveBodyparts = function (type) {
    var count = 0;
    for (var i = this.body.length; i-- > 0;) {
        if (this.body[i].hits > 0) {
            if (this.body[i].type === type) {
                count++;
            }
        } else break;
    }
    return count;
};

///**
// * Fast check if bodypart exists
// */
//Creep.prototype.hasActiveBodyparts = function (type) {
//    for (var i = this.body.length; i-- > 0;) {
//        if (this.body[i].hits > 0) {
//            if (this.body[i].type === type) {
//                return true;
//            }
//        } else break;
//    }
//    return false;
//};
//
//Creep.prototype.getFullname = function () {
//    if (!this.memory.tier || !this.memory.role) {
//        return this.name;
//    }
//    let role = creepRoles[this.memory.role];
//    let labelRole = (role.roleName.charAt(0).toUpperCase() + role.roleName.slice(1));
//    return `T${this.memory.tier}${labelRole}`;
//}
//Creep.prototype.sing = function (sentence, toAll) {
//    if (toAll === undefined) toAll = true;
//    let words = sentence.split("|");
//    this.say(words[Game.time % words.length], public);
//}
Creep.prototype.moveToAndPerform = function (target, action, ...args) {
    if (this.fatigue > 0) return OK;//TIRED
    let res = OK;
    // const color = '#' + ('00000' + (this.getFullname().split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0) & 0xFFFFFF).toString(16)).substr(-6);
    // noinspection CommaExpressionJS
    const color = str => '#' + new Array(3).fill().map((_, i) => Math.floor(((this.getFullname().split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) & 0xFF), 0) >> (i * 8)) / 2 + 128).toString(16).padStart(2, '0')).join('');
    const nrgStore = this.store.getFreeCapacity(RESOURCE_ENERGY);
    let nrgTarget = 0;
    if (target.store) {
        nrgTarget = target.store.getFreeCapacity(RESOURCE_ENERGY) || 0;
    }
    if (target instanceof StructureController) {
        nrgTarget = target.progress;
    }

    const moveOpts = {
        // noPathFinding: (Game.cpu.getUsed() <= 20),
        noPathFinding: true,
        reusePath: 16,
        visualizePathStyle: {
            fill: undefined, opacity: 0.6, stroke: color, strokeWidth: 0.04, lineStyle: 'dotted',
        },

        ignoreCreeps: true,
        ignoreDestructibleStructures: false,
        ignoreRoads: false,

        // ignore: [],
        // avoid: [
        //
        // ],
        maxOps: 2000,   // CPU /1000
        serializeMemory: true,
        serialize: false, maxRooms: 16, range: 0, plainCost: 1, // swampCost: 5,
        swampCost: 25,
    };

//     this.say(action)
    if (!this.memory.action || this.memory.action !== action) {
        this.memory.action = action;
    }
    if (typeof action === 'function') {
        res = action.call(this, target, ...args);
    } else {
        if (this[action] !== undefined) {
            res = this[action](target, ...args);
        } else {
            console.log('Unknown action ' + action)
            return ERR_BUSY;
        }
    }

    if (res === OK) {
        //Action Callbacks
        if (action === 'transfer') {
            if (target instanceof StructureController) {
                utils.addStat(`rooms.${this.room.name}.energyDeliveredToController`, this.getActiveBodyparts(WORK));
            }
        }
    }

    if (res === ERR_NOT_IN_RANGE || !this.pos.isNearTo(target)) {
        res = this.moveTo(target, moveOpts);
    }
    if (res === ERR_NOT_FOUND) {
        moveOpts.noPathFinding = false;
        moveOpts.ignoreCreeps = true;
        res = this.moveTo(target, moveOpts);
    }
    if (res === ERR_NO_PATH) {
        moveOpts.noPathFinding = false;
        moveOpts.reusePath = 0;
        moveOpts.ignoreCreeps = true;
        moveOpts.ignoreDestructibleStructures = true;
        moveOpts.ignoreRoads = false;
        res = this.moveTo(target, moveOpts);
    }

    if (res < 0) {
        console.log(`${this.name}.${action}(`+Array.from(target).join(", ")+`) failed: ${MSG_ERR[res]} at ${this.pos}`);
    }
    return res;
};

if (!Creep.prototype._moveTo) {
    Creep.prototype._moveTo = Creep.prototype.moveTo;
    Creep.prototype.moveTo = function (...myArgumentsArray) {
//        const target = myArgumentsArray[0];
//        let targetPos = myArgumentsArray;
//        if (target instanceof RoomPosition) {
//            targetPos = target;
//        } else if (target && typeof target.pos !== 'undefined') {
//            targetPos = target.pos;
//        }

        // Storing room usage
        const posKey = `${this.pos.x},${this.pos.y}`;
        if (!this.room.memory) {
            this.room.memory = {};
        }
        if (!this.room.memory.roadUsage) {
            this.room.memory.roadUsage = {};
        }
        if (!this.room.memory.roadUsage[posKey]) {
            this.room.memory.roadUsage[posKey] = 1;
        } else {
            this.room.memory.roadUsage[posKey]++;
        }

        //BEFORE
        let returnValue;
        returnValue = this._moveTo.apply(this, myArgumentsArray);
        this.registerMove(myArgumentsArray);
        //AFTER
        if (returnValue === ERR_INVALID_TARGET){
            // console.log(JSON.stringify(myArgumentsArray))
        }


        return returnValue;
    };
}

Creep.prototype.setBirthTick = function(tick = null) {
    if (!tick){
        tick = Game.time
    }
    this.memory.birthTick = tick;
    return tick;
};

Creep.prototype.setDeathTick = function(tick = null) {
    if (!tick){
        tick = Game.time + this.ticksToLive
    }
    this.memory.deathTick = tick;
    return tick;
};

Creep.prototype.getBirthTick = function() {
    if (!this.memory.birthTick){
        this.setBirthTick()
        this.setDeathTick()
        this.setBirthTick(this.getDeathTick() - CREEP_LIFE_TIME)
    }
    return this.memory.birthTick;
};

Creep.prototype.getDeathTick = function() {
    return this.memory.deathTick || this.setDeathTick();
};

Creep.prototype.initialized = function () {
    return (this.memory.initialized = true);
};
Creep.prototype.init = function () {
    this.setBirthTick();
    this.setDeathTick();
    this.setBirthTick(this.getDeathTick() - CREEP_LIFE_TIME)
    this.say(Game.time - this.getBirthTick())
    this.memory.initialized = true;
};