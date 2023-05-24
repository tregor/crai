class DeliveryQuest extends Quest {
    constructor(destination, resourceType, amount, priority = 0) {
        super('deliver', destination, {resourceType, amount}, priority);
    }

    run(creep) {
        const target = Game.getObjectById(this.target);
        const resourceType = this.params.resourceType;
        const amount = this.params.amount;

        if (creep.store[resourceType] < amount) {
            const quest = new StockupQuest(creep.id, amount);
            QuestsManager.addQuest(quest)
            QuestsManager.assignQuest(creep, quest)
            this.status = "error";
            return;
        }

        const result = creep.transfer(target, resourceType, amount);
        if (result === ERR_NOT_IN_RANGE) {
            const path = PathFinder.search(creep.pos, {pos: target.pos, range: 1});
            creep.moveByPath(path.path);
            this.buildRoad(creep);
        } else if (result === OK) {
            this.status = "completed";
        }
    }

    buildRoad(creep) {
        const constructionSite = creep.pos.lookFor(LOOK_CONSTRUCTION_SITES)[0];
        if (!constructionSite) {
            creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
        } else {
            creep.build(constructionSite);
        }
    }
}