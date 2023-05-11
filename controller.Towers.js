const config = require('./config');
const utils = require('./utils');
const creepRoles = require('./roles');

const towerController = {
    run: function () {
        // Пройдемся по всем башням в комнатах
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            const towers = room.find(FIND_MY_STRUCTURES, {
                filter: {structureType: STRUCTURE_TOWER}
            });

            // Обрабатываем каждую башню
            for (const tower of towers) {
                // Check for nearby enemies before attacking
                const enemies = tower.room.find(FIND_HOSTILE_CREEPS);
                const energyAvailable = room.energyAvailable;
                const energyCapacityAvailable = room.energyCapacityAvailable;
                // const energyPercentage = energyAvailable / energyCapacityAvailable;
                const energyPercentage = tower.store[RESOURCE_ENERGY] / tower.store.getCapacity(RESOURCE_ENERGY);
                tower.say(energyPercentage)

                // Автоматическое включение и выключение башни
                if (energyPercentage < config.towerPercentToAttack) {
                    continue; // Если энергии меньше 20%, выключаем башню
                }


                // Атака врагов
                if (energyPercentage >= config.towerPercentToAttack) {
                    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                    if (closestHostile) {
                        tower.attack(closestHostile);
                        continue;
                    }
                }

                // Лечим крипов
                if (energyPercentage >= config.towerPercentToHeal) {
                    const closestDamagedFriendly = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (c) => c.hits < c.hitsMax
                    });
                    if (closestDamagedFriendly) {
                        tower.heal(closestDamagedFriendly);
                        continue;
                    }
                }

                // Чиним сначала свои здания
                if (energyPercentage >= config.towerPercentToRepair) {
                    const damagedStructures = tower.room.find(FIND_MY_STRUCTURES, {
                        filter: (s) =>
                            s.hits < s.hitsMax
                    });
                    if (damagedStructures) {
                        damagedStructures.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                        tower.repair(damagedStructures[0]);
                        continue;
                    }
                }

                // Чиним все остальные структуры
                if (energyPercentage >= config.towerPercentToRepairAll) {
                    const damagedStructures = tower.room.find(FIND_STRUCTURES, {
                        filter: (s) =>
                        s.hits < s.hitsMax
                    });
                    tower.say(`${damagedStructures.length} : ${JSON.stringify(damagedStructures)}`)
                    if (damagedStructures) {
                        damagedStructures.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                        tower.repair(damagedStructures[0]);
                    }
                }
            }
        }
    }
};

module.exports = towerController;