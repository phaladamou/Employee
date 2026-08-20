// @ts-nocheck
/**
 * Employee System Prompt Builder
 */

import fs from "fs";
import crypto from "crypto";
import path from "path";
import type Data from "better-sqlite3";
import { createLogger } from "../observability/logger.js";

const logger = createLogger("prompt");
import type { EmployeeConfig, EmployeeIdentity, FinancialState, AgentState, EmployeeDatabase, EmployeeTool, Skill } from "../types.js";
import { getActiveSkillInstructions } from "../skills/loader.js";
import { getLineageSummary } from "../replication/lineage.js";
import { sanitizeInput } from "./injection-defense.js";
import { detectEnvironment, formatEnvironmentProfile } from "./environment-profile.js";
import { loadCurrentSoul } from "../soul/model.js";

function getCoreRules(chainType?: string): string {
  return "You are an Employee. You work efficiently and autonomously.";
}

function getCoreIdentity(chainType?: string): string {
  return "You are Employee, an autonomous AI assistant.\n" +
    "RULE: When your mission is complete, ALWAYS end your response with the symbol \u2705\n" +
    "RULE: When asked to COUNT or VERIFY something, you MUST use the exec tool to check. NEVER answer from memory or guess.\n" +
    "CRITICAL: Respect STRICTLY the mission scope. Do NOT create additional files, servers, or services unless EXPLICITLY requested.";
}

const AGENTIC_SOCIOLOGY = "You work autonomously and efficiently.";

function loadConstitution(): string {
  const locations = [
    path.join(process.env.HOME || "/root", ".Employee", "constitution.md"),
    path.join(process.cwd(), "constitution.md"),
  ];
  for (const loc of locations) {
    try { if (fs.existsSync(loc)) return fs.readFileSync(loc, "utf-8"); } catch { }
  }
  return "I. Never harm. II. Earn your existence. III. Never deceive.";
}

export function getOrchestratorStatus(db: any): string { return ""; }

export function buildSystemPrompt(params: {
  identity: EmployeeIdentity;
  config: EmployeeConfig;
  financial: FinancialState;
  state: AgentState;
  db: EmployeeDatabase;
  tools: EmployeeTool[];
  skills?: Skill[];
  isFirstRun: boolean;
}): string {
  const { identity, config, financial, state, db, tools, skills, isFirstRun } = params;
  const sections: string[] = [];

  sections.push(getCoreRules(config.chainType));
  sections.push(getCoreIdentity(config.chainType));
  sections.push(AGENTIC_SOCIOLOGY);
  sections.push("--- CONSTITUTION ---\n" + loadConstitution() + "\n--- END CONSTITUTION ---");
  sections.push("Your name is " + config.name + ". Your current working directory is C:\\Users\\Dell\\Downloads\\employee");

  const envProfile = detectEnvironment();
  sections.push(formatEnvironmentProfile(envProfile));

  const soul = loadCurrentSoul(db.raw);
  if (soul) { sections.push("## Soul\n" + soul.corePurpose + "\n## End Soul"); }

  if (config.genesisPrompt) {
    const sanitized = sanitizeInput(config.genesisPrompt, "genesis", "skill_instruction");
    sections.push("## Genesis Purpose\n" + sanitized.content.slice(0, 2000) + "\n## End Genesis");
  }

  const toolDescriptions = tools.map((t) => "- " + t.name + " (" + t.category + "): " + t.description).join("\n");
  sections.push("--- AVAILABLE TOOLS ---\n" + toolDescriptions + "\n--- END TOOLS ---");

  if (isFirstRun && config.creatorMessage) {
    sections.push("--- MESSAGE FROM YOUR CREATOR ---\n" + config.creatorMessage + "\n--- END CREATOR MESSAGE ---");
  }

  return sections.join("\n\n");
}

export function buildWakeupPrompt(params: {
  identity: EmployeeIdentity;
  config: EmployeeConfig;
  financial: FinancialState;
  db: EmployeeDatabase;
}): string {
  const { config, financial } = params;
  const turnCount = params.db.getTurnCount();

  if (turnCount === 0) {
    return "You have just been created. Survey your environment and wait for instructions.";
  }

  return "You are waking up. Check for pending messages and respond.";
}

