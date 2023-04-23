const config = require("./config");
module.exports = {
    roleName: 'default',
    memory: {
        default: true,
    },
    /** @param {Creep} creep **/
    run: function (creep) {
        creep.say('🔄 running');
    },
    getSuccessRate: function () {
        return 1; // 0.05 means 5% of effecienty
    },
    getBody: function (tier = 1){
        const body = [];
        for (let i = 0; i < tier; i++) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
        }
        return body;
    },
};