class Quest {
    constructor(taskType, target, params, priority = 0) {
        this.taskType = taskType;
        this.target = target;
        this.params = params;
        this.priority = priority;
        this.status = "waiting";
        this.assignedCreep = null;
    }

    assignCreep(creep) {
        this.assignedCreep = creep.name;
        this.status = "in_progress";
        creep.memory.task = this;
    }

    unassignCreep() {
        this.assignedCreep = null;
        this.status = "waiting";
    }

    completed(){
        this.status = "completed"
        this.assignedCreep.memory.questId = null;
    }
    error(){
        this.status = "error"
    }
}