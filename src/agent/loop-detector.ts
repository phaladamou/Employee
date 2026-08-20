import { isIdleOnlyTool } from "./idle-only-tools.js";

export interface LoopDetectorConfig {
  maxIdenticalCalls: number;
  maxIdleOnlyTurns: number;
  windowSize: number;
}

export interface LoopCheckResult {
  blocked: boolean;
  reason: string;
}

export class LoopDetector {
  private readonly config: LoopDetectorConfig;
  private callHistory: Array<{ name: string; argsHash: string }> = [];
  private turnPatterns: string[] = [];
  private currentTurnTools: string[] = [];
  private patternWarningIssued: string | null = null;
  private consecutiveIdleOnlyTurns = 0;
  private currentTurnIsIdleOnly = true;

  constructor(config?: Partial<LoopDetectorConfig>) {
    this.config = {
      maxIdenticalCalls: config?.maxIdenticalCalls ?? 3,
      maxIdleOnlyTurns: config?.maxIdleOnlyTurns ?? 3,
      windowSize: config?.windowSize ?? 10,
    };
  }

  recordToolCall(name: string, args: string): LoopCheckResult {
    const argsHash = simpleHash(args);
    this.callHistory.push({ name, argsHash });
    this.currentTurnTools.push(name);

    if (!isIdleOnlyTool(name)) {
      this.currentTurnIsIdleOnly = false;
    }

    const maxHistory = this.config.windowSize * 10;
    if (this.callHistory.length > maxHistory) {
      this.callHistory = this.callHistory.slice(-maxHistory);
    }

    const threshold = this.config.maxIdenticalCalls;
    if (this.callHistory.length >= threshold) {
      const recent = this.callHistory.slice(-threshold);
      const allIdentical = recent.every(
        (call) => call.name === name && call.argsHash === argsHash,
      );
      if (allIdentical) {
        return {
          blocked: true,
          reason:
            `You have called "${name}" with identical arguments ${threshold} times in a row. ` +
            "This is a loop. You MUST try a different approach, use a different tool, " +
            "or call task_done to report that you cannot complete this task.",
        };
      }
    }

    return { blocked: false, reason: "" };
  }

  endTurn(): LoopCheckResult {
    const pattern = [...this.currentTurnTools].sort().join(",");
    this.turnPatterns.push(pattern);
    if (this.turnPatterns.length > this.config.windowSize) {
      this.turnPatterns = this.turnPatterns.slice(-this.config.windowSize);
    }

    if (this.turnPatterns.length >= 3) {
      const last3 = this.turnPatterns.slice(-3);
      const allSame = last3.every((entry) => entry === pattern);
      if (allSame) {
        if (this.patternWarningIssued === pattern) {
          this.patternWarningIssued = null;
          this.turnPatterns = [];
          this.currentTurnTools = [];
          this.currentTurnIsIdleOnly = true;
          return {
            blocked: true,
            reason:
              `LOOP ENFORCEMENT: You were warned about repeating the tool pattern "${pattern}" ` +
              "but continued. You MUST take a completely different approach or call task_done " +
              `to report failure. Do NOT call any of these tools: ${pattern}.`,
          };
        }

        this.patternWarningIssued = pattern;
        this.currentTurnTools = [];
        this.currentTurnIsIdleOnly = true;
        return {
          blocked: false,
          reason:
            `WARNING: You have repeated the tool pattern "${pattern}" for 3 consecutive turns. ` +
            "This looks like a loop. On your next turn, you MUST try a different approach. " +
            "If you cannot make progress, call task_done with a failure summary.",
        };
      }
    }

    if (this.patternWarningIssued && pattern !== this.patternWarningIssued) {
      this.patternWarningIssued = null;
    }

    if (this.currentTurnIsIdleOnly && this.currentTurnTools.length > 0) {
      this.consecutiveIdleOnlyTurns++;
    } else {
      this.consecutiveIdleOnlyTurns = 0;
    }

    this.currentTurnTools = [];
    this.currentTurnIsIdleOnly = true;

    if (this.consecutiveIdleOnlyTurns >= this.config.maxIdleOnlyTurns) {
      this.consecutiveIdleOnlyTurns = 0;
      return {
        blocked: false,
        reason:
          `IDLE LOOP DETECTED: Your last ${this.config.maxIdleOnlyTurns} turns only used ` +
          "status-check tools. You already know your status. You MUST now execute a CONCRETE " +
          "action: write code, create a file, run a command, or call task_done if the task is complete.",
      };
    }

    return { blocked: false, reason: "" };
  }

  reset(): void {
    this.callHistory = [];
    this.turnPatterns = [];
    this.currentTurnTools = [];
    this.patternWarningIssued = null;
    this.consecutiveIdleOnlyTurns = 0;
    this.currentTurnIsIdleOnly = true;
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}







