const config = require("./config");
module.exports = {
    roleName: 'default',
    memory: {
        default: true,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        creep.say('🔄 running');


        // Perform task
        const target = Game.getObjectById(task.targetId);
        if (!target) {
            taskManager.removeTask(task.id);
            creep.memory.task = null;
            return;
        }
        const result = moveToAndPerform(creep, target, task.action);
        if (result === OK) {
            // Task complete
            taskManager.removeTask(task.id);
            creep.memory.task = null;
        } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
            // Task requires recharge
            const rechargeTask = new Task(RECHARGE, creep.id, null, {energy: true});
            taskManager.addTask(rechargeTask);
            creep.memory.task = rechargeTask.id;
        }
    },
    getSuccessRate: function () {
        return 1; // 0.05 means 5% of effecienty
    },
    getBody: function (tier = 1) {
        const body = [];
        for (let i = 0; i < tier; i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    },
};