const config = require('../config');
const utils = require("../utils");
const creepRoles = require('../roles');

const DevelopmentController = {
    run: function () {
        // Get all owned rooms
        const myRooms = _.filter(Game.rooms, r => r.controller && r.controller.my);

        // Loop through each room
        myRooms.forEach(room => {
            // Get room variables
            const energyCapacity = room.energyCapacityAvailable;
            const controllerLevel = room.controller.level;
            const hasExtension = structures.hasExtension(room);
            const hasTower = structures.hasTower(room);
            const hasSpawn = structures.hasSpawn(room);
            const hasContainer = structures.hasContainer(room);
            const hasRoad = structures.hasRoad(room);
            const hasWall = structures.hasWall(room);

            // Plan building priorities
            const priorities = {
                [STRUCTURE_SPAWN]: 1,
                [STRUCTURE_TOWER]: 2,
                [STRUCTURE_EXTENSION]: hasExtension ? 3 : 0,
                [STRUCTURE_CONTAINER]: hasContainer ? 4 : 0,
                [STRUCTURE_ROAD]: hasRoad ? 5 : 0,
                [STRUCTURE_WALL]: hasWall ? 6 : 0
            };
            // Sort building priorities by importance
            const sortedPriorities = Object.keys(priorities).sort((a, b) => priorities[a] - priorities[b]);
        });
    }
}