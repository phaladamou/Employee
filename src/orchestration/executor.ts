import type { TaskNode } from "./task-graph.js";


export class Executor {
  async executeTask(task: TaskNode, tools: any, context: any): Promise<any> {
    if (!task.assignedTo) {
      return { success: false, error: "Task not assigned" };
    }

    try {
      const result = await context.executeTool(task.title, {}, tools);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
