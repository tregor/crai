const config = require('../config');
const utils = require("../utils");
const creepRoles = require('../roles');

class TaskController {
    constructor() {
        this.tasks = {};
    }

    addTask(task) {
        if (!this.tasks[task.type]) {
            this.tasks[task.type] = [];
        }
        this.tasks[task.type].push(task);
    }

    removeTask(task) {
        const index = this.tasks[task.type].indexOf(task);
        if (index > -1) {
            this.tasks[task.type].splice(index, 1);
        }
    }

    getNextTask(creep) {
        const taskTypes = Object.keys(this.tasks).sort((a, b) => {
            return creepRoles[creep.memory.role].taskPriority[b] - creepRoles[creep.memory.role].taskPriority[a];
        });

        for (let i = 0; i < taskTypes.length; i++) {
            const tasks = this.tasks[taskTypes[i]];
            for (let j = 0; j < tasks.length; j++) {
                const task = tasks[j];
                if (creep.canDoTask(task)) {
                    return task;
                }
            }
        }

        return null;
    }
}

class Task {
    constructor(taskType, target, params, priority = 0) {
        this.taskType = taskType;
        this.target = target;
        this.params = params;
        this.priority = priority;
        this.completed = false;
        this.cancelled = false;
    }

    run() {
        console.log(`Task ${this.taskType} started.`);
        // Реализация логики задачи
        console.log(`Task ${this.taskType} completed.`);
        this.completed = true;
    }

    complete() {
        console.log(`Task ${this.taskType} completed.`);
        this.completed = true;
    }

    cancel() {
        console.log(`Task ${this.taskType} cancelled.`);
        this.cancelled = true;
    }
}

class HarvestTask extends Task {
    constructor(source, resourceType, amount, priority = 0) {
        super('harvest', source, {resourceType, amount}, priority);
    }

    run(creep) {
        console.log(`Task ${this.taskType} started: harvesting ${this.params.amount} of ${this.params.resourceType} from ${this.target}.`);
        // Реализация логики задачи добычи ресурсов
        console.log(`Task ${this.taskType} completed.`);
        this.completed = true;
    }
}

class DeliverTask extends Task {
    constructor(destination, resourceType, amount, priority = 0) {
        super('deliver', destination, {resourceType, amount}, priority);
    }

    run(creep) {
        console.log(`Task ${this.taskType} started: delivering ${this.params.amount} of ${this.params.resourceType} to ${this.target}.`);
        const target = Game.getObjectById(this.target);

        // Получаем доступ к ресурсам и проверяем, достаточно ли их для выполнения задачи
        const resourceType = this.params.resourceType;
        const amount = this.params.amount;
        // const creep = Game.creeps[this.assignedCreep];

        if (creep.store[resourceType] < amount) {
            console.log(`Task ${this.taskType} failed: not enough resources.`);
            return;
        }

        // Выполняем передачу ресурсов
        const result = creep.transfer(target, resourceType, amount);
        if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
        } else if (result === OK) {
            console.log(`Task ${this.taskType} completed.`);
            this.completed = true;
        }
    }
}

class BuildTask extends Task {
    constructor(site, priority = 0) {
        super('build', site, {}, priority);
    }

    run() {
        console.log(`Task ${this.taskType} started: building at ${this.target}.`);
        // Реализация логики задачи строительства
        console.log(`Task ${this.taskType} completed.`);
        this.completed = true;
    }
}

class RepairTask extends Task {
    constructor(structure, priority = 0) {
        super('repair', structure, {}, priority);
    }

    run() {
        console.log(`Task ${this.taskType} started: repairing ${this.target}.`);
        // Реализация логики задачи ремонта
        console.log(`Task ${this.taskType} completed.`);
        this.completed = true;
    }
}