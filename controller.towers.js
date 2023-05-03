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

                // Автоматическое включение и выключение башни
                if (energyPercentage < 0.2) {
                    continue; // Если энергии меньше 20%, выключаем башню
                }

                // Атака врагов
                const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                if (closestHostile && energyPercentage >= 0.2) {
                    tower.attack(closestHostile);
                    continue;
                }

                // Лечим крипов
                const closestDamagedFriendly = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                    filter: (c) => c.hits < c.hitsMax
                });
                if (closestDamagedFriendly && energyPercentage >= 0.3) {
                    tower.heal(closestDamagedFriendly);
                    continue;
                }

                // Чиним здания
                const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (s) =>
                        s.hits < (s.hitsMax / 2)
                    // && s.structureType !== STRUCTURE_WALL
                    // && s.structureType !== STRUCTURE_RAMPART
                });
                if (closestDamagedStructure && energyPercentage >= 0.5) {
                    tower.repair(closestDamagedStructure);

                }
            }
        }
    }
};

module.exports = towerController;