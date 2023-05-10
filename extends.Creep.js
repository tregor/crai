const config = require('./config');
const utils = require("./utils");
const creepRoles = require('./roles');

Creep.prototype.getFullname = function () {
    if (!this.memory.tier || !this.memory.role) {
        return this.name;
    }
    let role = creepRoles[this.memory.role];
    let labelRole = (role.roleName.charAt(0).toUpperCase() + role.roleName.slice(1));
    return `T${this.memory.tier}${labelRole}`;
}
Creep.prototype.moveToAndPerform = function (target, action, ...args) {
    if (this.fatigue > 0) return OK;//TIRED
    let res = OK;
    // const color = '#' + ('00000' + (this.getFullname().split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0) & 0xFFFFFF).toString(16)).substr(-6);
    // noinspection CommaExpressionJS
    const color = str => '#' + new Array(3).fill().map((_, i) => Math.floor(((this.getFullname().split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) & 0xFF), 0) >> (i * 8)) / 2 + 128).toString(16).padStart(2, '0')).join('');
    const nrgStore = this.store.getFreeCapacity(RESOURCE_ENERGY);
    let nrgTarget = 0;
    if (target.store){
        nrgTarget = target.store.getFreeCapacity(RESOURCE_ENERGY) || 0;
    }
    if (target instanceof StructureController){
        nrgTarget = target.progress;
    }

    const moveOpts = {
        noPathFinding: (Game.cpu.getUsed() >= 20),
        reusePath: 16,
        visualizePathStyle: {
            fill: undefined,
            opacity: 0.6,
            stroke: color,
            strokeWidth: 0.04,
            lineStyle: 'dotted',
        },

        ignoreCreeps: false,
        ignoreDestructibleStructures: false,
        ignoreRoads: false,

        // ignore: [],
        // avoid: [
        //
        // ],
        maxOps: 2000,   // CPU /1000
        serialize: false,
        maxRooms: 1,
        range: 0,
        plainCost: 1,
        // swampCost: 5,
        swampCost: 25,
    };

//     this.say(action)
    if (!this.memory.action || this.memory.action !== action) {
        this.memory.action = action;
    }
    if (typeof action === 'function') {
        res = action.call(this, target, ...args);
    } else{
        if (this[action] !== undefined){
            res = this[action](target, ...args);   
        }else{
            console.log('Unknown action '+action)
            return ERR_BUSY;
        }
    }

    if (res === OK){
        //Action Callbacks
        if (action === 'transfer'){
            if (target instanceof StructureController){
                utils.addStat(`rooms.${this.room.name}.energyDeliveredToController`, this.getActiveBodyparts(WORK));
            }
        }
    }

    if (res === ERR_NOT_IN_RANGE || !this.pos.isNearTo(target)) {
        res = this.moveTo(target, moveOpts);
    }
    if (res === ERR_NOT_FOUND) {
        moveOpts.noPathFinding = false;
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
    // this.say(res)
    return res;
};

if (!Creep.prototype._moveTo) {
    Creep.prototype._moveTo = Creep.prototype.moveTo;
    Creep.prototype.moveTo = function(...myArgumentsArray) {

        const posKey = `${this.pos.x},${this.pos.y}`;
        if (!this.room.memory.roadUsage[posKey]) {
            this.room.memory.roadUsage[posKey] = 1;
        } else {
            this.room.memory.roadUsage[posKey]++;
        }

        //BEFORE
        let returnValue = this._moveTo.apply(this, myArgumentsArray);
        //AFTER


        return returnValue;
    };
}