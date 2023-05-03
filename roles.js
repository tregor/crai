const roles = {
    hauler: require('role.hauler'),
    miner: require('role.miner'),
    builder: require('role.builder'),

    defender: require('role.defender'),
    scout: require('role.scout'),

    worker: require('role.worker'),
    // добавляем сюда другие роли
};

module.exports = roles;