const roles = {
    miner: require('role.miner'),
    hauler: require('role.hauler'),
    builder: require('role.builder'),

    defender: require('role.defender'),

    worker: require('role.worker'),
    // добавляем сюда другие роли
};

module.exports = roles;