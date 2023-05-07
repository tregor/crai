const roles = {
    miner: require('role.miner'),
    hauler: require('role.hauler'),
    builder: require('role.builder'),
    repairer: require('role.repairer'),

    worker: require('role.worker'),

    defender: require('role.defender'),
    scout: require('role.scout'),

    // добавляем сюда другие роли
};

module.exports = roles;