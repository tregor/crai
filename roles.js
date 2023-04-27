const roles = {
    // worker: require('role.worker'),
    miner: require('role.miner'),
    hauler: require('role.hauler'),
    builder: require('role.builder'),

    defender: require('role.defender'),
    scout: require('role.scout'),

    worker: require('role.worker'),
    // добавляем сюда другие роли
};

module.exports = roles;