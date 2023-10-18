const roles = {
    miner: require('roles/miner'),
    hauler: require('roles/hauler'),
    builder: require('roles/builder'),
    // repairer: require('roles/repairer'),

    worker: require('roles/worker'),

    defender: require('roles/defender'),
    scout: require('roles/scout'),

    // добавляем сюда другие роли
};

module.exports = roles;