const roles = {
    worker: require('role.worker'),
    hauler: require('role.hauler'),
    miner: require('role.miner'),
    builder: require('role.builder'),
    // добавляем сюда другие роли
};

module.exports = roles;