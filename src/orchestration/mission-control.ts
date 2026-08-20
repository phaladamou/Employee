import type { Goal, TaskNode } from "./task-graph.js";
import type { VerificationResult } from "./evidence.js";
import { VerificationEngine } from "./verification.js";

export type MissionPhase = 
  | "idle" 
  | "planning" 
  | "executing" 
  | "verifying" 
  | "recovering" 
  | "replanning" 
  | "completed" 
  | "failed";

export interface MissionState {
  goalId: string;
  phase: MissionPhase;
  currentTask: TaskNode | null;
  planValid: boolean;
  progress: number;
  failures: number;
  lastError: string | null;
  verified: boolean;
}

const VALID_TRANSITIONS: Record<MissionPhase, MissionPhase[]> = {
  idle: ["planning"],
  planning: ["executing", "failed"],
  executing: ["verifying", "failed", "recovering"],
  verifying: ["completed", "recovering"],
  recovering: ["executing", "replanning", "failed"],
  replanning: ["executing", "failed"],
  completed: [],
  failed: ["planning"],
};

export class MissionControl {
  private currentGoal: Goal | null = null;
  private phase: MissionPhase = "idle";
  private verificationEngine: VerificationEngine;
  private verificationResult: VerificationResult | null = null;
  private verified = false;
  private toolExecuted = false;
  private lastObservation: string | undefined = undefined;
  private lastError: string | null = null;

  constructor(private taskGraph: any) {
    this.verificationEngine = new VerificationEngine();
  }

  async startMission(goal: Goal): Promise<void> {
    this.currentGoal = goal;
    this.phase = "executing";
    this.verificationResult = null;
    this.verified = false;
    this.toolExecuted = false;
    this.lastObservation = undefined;
    this.lastError = null;
  }

  private transition(to: MissionPhase): void {
    const allowed = VALID_TRANSITIONS[this.phase] || [];
    if (!allowed.includes(to)) {
      console.warn("[MISSION CONTROL] Transition invalide: " + this.phase + " -> " + to);
      return;
    }
    this.phase = to;
  }

  reportToolExecuted(): void {
    this.toolExecuted = true;
  }

  reportThinking(text: string): void {
    if (text.includes("MISSION ACCOMPLIE") || text.includes("MISSION COMPLETE") || text.includes("✅")) {
      if (this.toolExecuted) {
        this.transition("verifying");
        this.verified = true;
        this.transition("completed");
      } else {
        console.warn("[MISSION CONTROL] Claim detected but no tool executed. Verification required.");
      }
    }
  }

  recordObservation(observation: string): void {
    this.lastObservation = observation;
  }

  evaluateProgress(): boolean {
    return this.toolExecuted && this.lastObservation !== undefined;
  }

  requestVerification(): void {
    if (this.evaluateProgress()) {
      this.transition("verifying");
    }
  }

  handleFailure(error: string): void {
    this.lastError = error;
    this.transition("recovering");
  }

  recover(): void {
    this.transition("executing");
  }

  completeMission(): void {
    if (this.toolExecuted || this.verified) {
      this.transition("verifying");
      this.verified = true;
      this.transition("completed");
    } else {
      console.warn("[MISSION CONTROL] Cannot complete mission without tool execution.");
    }
  }

  async tick(): Promise<MissionState> {
    if (!this.currentGoal) {
      return { goalId: "", phase: "idle", currentTask: null, planValid: true, progress: 0, failures: 0, lastError: null, verified: false };
    }

    switch (this.phase) {
      case "planning":
        this.transition("executing");
        break;

      case "executing":
        if (this.taskGraph && this.taskGraph.getReadyTasks) {
          const readyTasks = this.taskGraph.getReadyTasks(this.currentGoal.id);
          if (readyTasks.length > 0) {
            return { goalId: this.currentGoal.id, phase: "executing", currentTask: readyTasks[0], planValid: true, progress: 0, failures: 0, lastError: null, verified: false };
          }
        }
        this.transition("verifying");
        break;

      case "verifying":
        if (this.toolExecuted || this.verified) {
          this.transition("completed");
        } else {
          this.transition("recovering");
        }
        break;

      case "recovering":
        this.transition("executing");
        break;

      case "replanning":
        this.transition("executing");
        break;
    }

    return { goalId: this.currentGoal.id, phase: this.phase, currentTask: null, planValid: true, progress: 0, failures: 0, lastError: null, verified: this.verified };
  }

  getPhase(): MissionPhase {
    return this.phase;
  }

  isTerminal(): boolean {
    return this.phase === "completed" || this.phase === "failed";
  }

  reportFailure(error: string): void {
    this.transition("recovering");
  }

  reportProgress(progress: number): void {
    if (progress >= 100 && this.toolExecuted) {
      this.transition("verifying");
      this.verified = true;
      this.transition("completed");
    }
  }
}
