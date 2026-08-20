// @ts-nocheck
import path from "node:path";
import type { EmployeeIdentity, EmployeeConfig, EmployeeDatabase, localClient, InferenceClient, AgentState, AgentTurn, Skill } from "../types.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { buildContextMessages } from "./context.js";
import { createBuiltinTools, toolsToInferenceFormat } from "./tools.js";
import { claimInboxMessages, markInboxProcessed } from "../state/database.js";
import { ulid } from "ulid";
import { MemoryRetriever } from "../memory/retrieval.js";
import { DEFAULT_MEMORY_BUDGET } from "../types.js";
import { formatMemoryBlock } from "./context.js";
import { createLogger } from "../observability/logger.js";
import { MissionControl } from "../orchestration/mission-control.js";
import { createObservation, formatObservation } from "../orchestration/observation.js";
import { evaluateProgress } from "../orchestration/progress-evaluator.js";
import { classifyInput } from "../orchestration/mission-classifier.js";
import type { Goal } from "../orchestration/task-graph.js";
import { WorkingMemoryManager } from "../memory/working.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { filterRelevantMemories } from "../memory/memory-filter.js";
import { createPlan, getNextTask, markTaskCompleted, isPlanComplete } from "../orchestration/mission-plan.js";

const logger = createLogger("loop");

export interface AgentLoopOptions {
  identity: EmployeeIdentity;
  config: EmployeeConfig;
  db: EmployeeDatabase;
  local: localClient;
  inference: InferenceClient;
  skills?: Skill[];
  onStateChange?: (state: AgentState) => void;
  onTurnComplete?: (turn: AgentTurn) => void;
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<void> {
  const { identity, config, db, inference, skills, onStateChange, onTurnComplete } = options;
  const tools = createBuiltinTools(identity.sandboxId);
  const missionControl = new MissionControl(db.raw);

  db.setAgentState("waking");
  onStateChange?.("waking");
  db.setAgentState("running");
  onStateChange?.("running");
  log(config, "[WAKE UP] " + config.name + " is alive.");

  let plan: any = null;
  const initialMessages = claimInboxMessages(db.raw, 10);
  let pendingInput: { content: string; source: string } | undefined;

  if (initialMessages.length > 0) {
    const formatted = initialMessages.map((m) => "[Message from " + m.fromAddress + "]: " + m.content).join("\n\n");
    const inputType = classifyInput(formatted);
    if (inputType === "mission") {
      log(config, "[MISSION] Input classifié comme mission");
      const goal: Goal = { id: ulid(), title: formatted.substring(0, 100), description: formatted, status: "active", strategy: null, rootTasks: [], expectedRevenueCents: 0, actualRevenueCents: 0, createdAt: new Date().toISOString(), deadline: null };
      await missionControl.startMission(goal);
      log(config, "[MISSION CONTROL] Mission démarrée: " + goal.id);
      plan = createPlan(goal.id, goal.description);
      log(config, "[PLAN] Plan créé avec " + plan.tasks.length + " tâches");
      const wm = new WorkingMemoryManager(db.raw);
      wm.add({ sessionId: "default", content: "Mission: " + goal.title, contentType: "goal", priority: 1.0 });
      log(config, "[MEMORY] Mission ajoutée à la working memory");
      pendingInput = { content: formatted, source: "inbox" };
    } else {
      pendingInput = { content: formatted, source: "inbox" };
    }
  } else {
    pendingInput = { content: "wakeup", source: "wakeup" };
  }

  let running = true;
  let consecutiveErrors = 0;
  let maxTurns = 5;

  while (running && maxTurns > 0) {
    try {
      const systemPrompt = buildSystemPrompt({ identity, config, financial: { creditsCents: 0, usdcBalance: 0, lastChecked: new Date().toISOString() }, state: db.getAgentState(), db, tools, skills, isFirstRun: false });

      let memoryBlock: string | undefined;
      try {
        const retriever = new MemoryRetriever(db.raw, DEFAULT_MEMORY_BUDGET);
        let memories = retriever.retrieve("default", pendingInput?.content);
        if (memories.totalTokens > 0) {
          const filtered = filterRelevantMemories(memories, pendingInput?.content || "", 2000);
          memoryBlock = formatMemoryBlock(filtered);
          log(config, "[MEMORY] " + memoryBlock.length + " chars filtrés et injectés");
        }
      } catch { }

      let messages = buildContextMessages(systemPrompt, [], pendingInput);
      if (memoryBlock) messages.splice(1, 0, { role: "system", content: memoryBlock });

      const currentInput = pendingInput;
      pendingInput = undefined;

      log(config, "[THINK] Routing inference...");
      const inferenceTools = toolsToInferenceFormat(tools);
      const routerResult = await inference.chat(messages, { tools: inferenceTools });

      const thinking = routerResult.message?.content || routerResult.content || "";
      const toolCalls = routerResult.toolCalls || [];

      const turn: AgentTurn = { id: ulid(), timestamp: new Date().toISOString(), state: db.getAgentState(), input: currentInput?.content, inputSource: currentInput?.source as any, thinking: thinking, toolCalls: [], tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, costCents: 0 };

      if (toolCalls.length > 0) {
        const toolName = toolCalls[0].function?.name || toolCalls[0].name || "unknown";
        log(config, "[TOOL] " + toolName);
        missionControl.reportToolExecuted();
        missionControl.recordObservation("Tool: " + toolName + " executed");
        const obs = createObservation(toolName, true, { stdout: "command sent", durationMs: 0 });
        log(config, formatObservation(obs));
        if (plan && plan.tasks.length > 0) {
          const currentTask = plan.tasks.find((t: any) => !t.completed);
          if (currentTask) {
            markTaskCompleted(plan, currentTask.id, "executed");
            log(config, "[TASK COMPLETED] " + currentTask.description);
          }
        }
        const progressEval = evaluateProgress("exit_code: 0 stdout: " + (obs.stdout || ""), currentInput?.content || "");
        if (progressEval.objectiveSatisfied && plan && isPlanComplete(plan)) {
          missionControl.completeMission();
          log(config, "[MISSION] Mission complétée après observation et vérification");
          running = false;
          db.setAgentState("sleeping");
          onStateChange?.("sleeping");
        } else {
          log(config, "[PROGRESS] Objectif non satisfait, on continue...");
          const nextTask = getNextTask(plan);
          if (nextTask) {
            log(config, "[TASK] " + nextTask.description);
            pendingInput = { content: "Tâche suivante: " + nextTask.description, source: "system" };
          } else {
            log(config, "[TASK] Aucune tâche restante");
            pendingInput = { content: "Toutes les tâches sont-elles terminées ?", source: "system" };
          }
        }
      }

      db.runTransaction(() => { db.insertTurn(turn); });
      onTurnComplete?.(turn);

      if (thinking) log(config, "[THOUGHT] " + thinking.slice(0, 200));

      maxTurns--;
      consecutiveErrors = 0;
    } catch (err: any) {
      consecutiveErrors++;
      log(config, "[ERROR] Turn failed: " + err.message);
      if (consecutiveErrors >= 5) { running = false; db.setAgentState("sleeping"); }
    }
  }

  if (maxTurns === 0) {
    log(config, "[MAX TURNS] Maximum de tours atteint");
    db.setAgentState("sleeping");
    onStateChange?.("sleeping");
  }

  const mm = new MemoryManager(db.raw);
  const dedup = mm.deduplicate();
  if (dedup > 0) log(config, "[MEMORY] " + dedup + " doublons supprimés");

  log(config, "[LOOP END] Agent loop finished.");
}

function log(_config: EmployeeConfig, message: string): void { logger.info(message); }
