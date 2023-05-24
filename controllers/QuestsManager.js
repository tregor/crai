const creepRoles = require("../roles");

class QuestsManager {
    constructor() {
        if (!Memory.questsManager) {
            Memory.questsManager = {
                quests: []
            };
        }
        this.quests = [];
        this.questTypesByRole = {
            miner: ['default', 'mining'],
            hauler: ['default', 'hauling'],
            // ... другие роли и их доступные типы квестов
        };
        this.memory = Memory.questsManager;
        this.quests = this.memory.quests;
    }

    addQuest(Quest) {
        if (!this.quests[Quest.type]) {
            this.quests[Quest.type] = [];
        }
        this.quests[Quest.type].push(Quest);
    }

    removeQuest(Quest) {
        const index = this.quests[Quest.type].indexOf(Quest);
        if (index > -1) {
            this.quests[Quest.type].splice(index, 1);
        }
    }

    assignQuest(creep, quest) {
        if (!creep.memory.questId) {
            const availableQuestTypes = this.getAvailableQuestsForRole(creep.memory.role);
            if (availableQuestTypes.includes(quest.type)) {
                creep.memory.questId = quest.id;
                quest.assign(creep.id);
            } else {
                console.log(`Quest type ${quest.type} is not available for role ${creep.memory.role}`);
            }
        } else {
            console.log(`Creep ${creep.name} is already assigned to a quest`);
        }
    }

    getAvailableQuestsForRole(role) {
        return this.questTypesByRole[role] || [];
    }
}