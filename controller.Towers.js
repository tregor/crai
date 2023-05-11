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
                if (energyPercentage < 0.1) {
                    continue; // Если энергии меньше 20%, выключаем башню
                }


                // Атака врагов
                if (energyPercentage >= 0.1){
                    const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
                    if (closestHostile && energyPercentage >= 0.1) {
                        tower.attack(closestHostile);
                        continue;
                    }
                }

                // Лечим крипов
                if (energyPercentage >= 0.2){
                    const closestDamagedFriendly = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
                        filter: (c) => c.hits < c.hitsMax
                    });
                    if (closestDamagedFriendly && energyPercentage >= 0.4) {
                        tower.heal(closestDamagedFriendly);
                        continue;
                    }
                }

                // Чиним крипов TODO REDO only structures allowed
                if (energyPercentage >= 0.4){
//                    const brokenCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
//                        filter: (creep) => creep.ticksToLive < 1500 * 0.4 //1500 max ttl
//                    && creep.memory.tier >= 4
//                    });
//                    if (brokenCreep) {
//                        tower.repair(brokenCreep);
//                    }
                }

                // Чиним здания
                if (energyPercentage >= 0.6){
                    const damagedStructures = tower.room.find(FIND_STRUCTURES, {
                        filter: (s) =>
                        s.hits < s.hitsMax
                    });
                    if (damagedStructures && energyPercentage >= 0.8) {
                        damagedStructures.sort((a, b) => a.hits / a.hitsMax - b.hits / b.hitsMax);
                        tower.repair(damagedStructures[0]);
                    }
                }
            }
        }
    }
};

module.exports = towerController;