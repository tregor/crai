const config = require('./config');
const creepRoles = require('./roles');

const controllerCreeps = {
    run: function () {
        for (const name in Game.creeps) {
            const creep = Game.creeps[name];
            const role = creepRoles[creep.memory.role];

            if (role) {
                role.run(creep);
            }
        }
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                console.log(`Creep ${name} was dead`)
                delete Memory.creeps[name];
                // const roomName = Memory.creeps[name]._move.room;
                // const room = Game.rooms[roomName];
                // if (!room){
                //     continue;
                // }
                // let tombstone = room.find(FIND_TOMBSTONES, {
                //     filter: (tombstone) => tombstone.creep.name === name
                // });
                // if (tombstone.length > 0){
                //     tombstone = tombstone[0];
                //     const room = tombstone.room;
                //     if (tombstone.memory && !tombstone.memory.hadFuneral){
                //         const nearbyCreeps = tombstone.pos.findInRange(FIND_MY_CREEPS, 1, {
                //             filter: c => c.id !== name // исключаем умершего крипа из выбора
                //         });
                //         if (nearbyCreeps.length >= 5) {
                //             console.log(`Creep ${name}'s funeral has been held.`);
                //             tombstone.memory.hadFuneral = true;
                //             // tombstone.destroy();
                //             delete Memory.creeps[name];
                //         } else {
                //             // выбираем 5 случайных крипов из списка соседних крипов
                //             const funeralAttendees = _.sampleSize(nearbyCreeps, 5);
                //             funeralAttendees.forEach(creep => creep.moveTo(tombstone));
                //             console.log(`Waiting for more creeps to attend ${name}'s funeral.`);
                //         }
                //     }else{
                //         // tombstone.destroy();
                //         delete Memory.creeps[name];
                //     }
                // }else{
                //     delete Memory.creeps[name];
                // }
            }
        }
    }
};

module.exports = controllerCreeps;
