export interface MissionTask {
  id: string;
  description: string;
  tool: string;
  args?: Record<string, unknown>;
  completed: boolean;
  observation?: string;
}

export interface MissionPlan {
  goalId: string;
  tasks: MissionTask[];
  currentTaskIndex: number;
}

export function createPlan(goalId: string, missionDescription: string): MissionPlan {
  // Simple heuristique : décomposer la mission en étapes basiques
  const tasks: MissionTask[] = [];
  
  if (missionDescription.toLowerCase().includes("compte") || missionDescription.toLowerCase().includes("count")) {
    tasks.push({ id: "task-1", description: "Count files using dir command", tool: "exec", completed: false });
  } else if (missionDescription.toLowerCase().includes("analyse") || missionDescription.toLowerCase().includes("analyze")) {
    tasks.push({ id: "task-1", description: "List files in src/agent", tool: "exec", completed: false });
    tasks.push({ id: "task-2", description: "Read key files", tool: "exec", completed: false });
    tasks.push({ id: "task-3", description: "Write report", tool: "write_file", completed: false });
  } else {
    tasks.push({ id: "task-1", description: missionDescription, tool: "exec", completed: false });
  }

  return { goalId, tasks, currentTaskIndex: 0 };
}

export function getNextTask(plan: MissionPlan): MissionTask | null {
  const next = plan.tasks.find(t => !t.completed);
  return next || null;
}

export function markTaskCompleted(plan: MissionPlan, taskId: string, observation: string): void {
  const task = plan.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = true;
    task.observation = observation;
    plan.currentTaskIndex++;
  }
}

export function isPlanComplete(plan: MissionPlan): boolean {
  return plan.tasks.every(t => t.completed);
}
