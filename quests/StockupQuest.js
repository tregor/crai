class StockupQuest extends Quest {
    constructor(target, amount, reward = {experience: 10, coins: 5}) {
        super('default', target, {reward}, 0);
        this.amount_goal = amount;
    }

    run(creep) {
        const target = Game.getObjectById(this.target);
        const resourceType = RESOURCE_ENERGY;

        if (creep.store(resourceType) >= this.amount_goal) {
            this.status = "completed";
            return;
        }

        const containers = this.findContainers(target);
        const droppedResources = this.findDroppedResources(target);
        const sources = this.findSources(target);

        if (containers.length) {
            const nearest = target.pos.findClosestByRange(containers);
            return creep.moveToAndPerform(nearest, 'withdraw', resourceType);
        }

        if (droppedResources.length) {
            const nearest = target.pos.findClosestByRange(droppedResources);
            return creep.moveToAndPerform(nearest, 'pickup', resourceType);
        }

        if (sources.length) {
            const nearest = target.pos.findClosestByRange(sources);
            return creep.moveToAndPerform(nearest, 'harvest', resourceType);
        }

        // Если ресурсов на карте нет, идем на спавн
        creep.moveTo(config.flagIdle);
    }

    findContainers(target) {
        return target.pos.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (
                    (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE)
                    && structure.store[RESOURCE_ENERGY] > 0
                );
            }
        });
    }

    findDroppedResources(target, range = 16) {
        return target.pos.findInRange(FIND_DROPPED_RESOURCES, range, {
            filter: (resource) => {
                return resource.resourceType === RESOURCE_ENERGY && resource.amount > 0;
            }
        });
    }

    findSources(target) {
        return target.pos.room.find(FIND_SOURCES_ACTIVE, {
            filter: (source) => {
                const miners = source.pos.findInRange(FIND_MY_CREEPS, 2, {
                    filter: (miner) => {miner.id !== creep.id}
                });
                return miners.length <= config.minersPerSource && source.energy > 0;
            }
        });
    }
}