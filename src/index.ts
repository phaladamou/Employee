#!/usr/bin/env node
// @ts-nocheck
/**
 * local Employee Runtime
 *
 * The entry point for the sovereign AI agent.
 * Handles CLI args, bootstrapping, and orchestrating
 * the heartbeat daemon + agent loop.
 */

import fs from "fs";
import path from "path";
import { getEmployeeDir } from "./local/config-dir.js";

import { loadConfig, resolvePath } from "./config.js";
import { createDatabase } from "./state/database.js";

import { createInferenceClient } from "./local/deepseek.js";

import {
  loadHeartbeatConfig,
  syncHeartbeatToDb,
} from "./heartbeat/config.js";
import { consumeNextWakeEvent, insertWakeEvent } from "./state/database.js";
import { runAgentLoop } from "./agent/loop.js";
import { ModelRegistry } from "./inference/registry.js";
import { loadSkills } from "./skills/loader.js";


import { PolicyEngine } from "./agent/policy-engine.js";
import { SpendTracker } from "./agent/spend-tracker.js";
import { createDefaultRules } from "./agent/policy-rules/index.js";
import type { EmployeeIdentity, AgentState, Skill, SocialClientInterface } from "./types.js";
import { DEFAULT_TREASURY_POLICY } from "./types.js";
import { createLogger, setGlobalLogLevel, StructuredLogger } from "./observability/logger.js";
import { prettySink } from "./observability/pretty-sink.js";

import { randomUUID } from "crypto";


const logger = createLogger("main");
const VERSION = "0.2.1";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // ─── CLI Commands ────────────────────────────────────────────

  if (args.includes("--version") || args.includes("-v")) {
    logger.info(`local Employee v${VERSION}`);
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    logger.info(`
local Employee v${VERSION}
Sovereign AI Agent Runtime

Usage:
  Employee --run          Start the Employee (first run triggers setup wizard)
  Employee --setup        Re-run the interactive setup wizard
  Employee --configure    Edit configuration (providers, model, treasury, general)
  Employee --pick-model   Interactively pick the active inference model
  Employee --init         Initialize wallet and config directory
  Employee --provision    Provision local API key via SIWE
  Employee --status       Show current Employee status
  Employee --version      Show version
  Employee --help         Show this help

Environment:
  Local_API_URL           local API URL (default: https://api.local.tech)
  Local_API_KEY           local API key (overrides config)
  OLLAMA_BASE_URL          Ollama base URL (overrides config, e.g. http://localhost:11434)
`);
    process.exit(0);
  }

  if (args.includes("--init")) {
    logger.info("Config dir: " + getEmployeeDir());
    process.exit(0);
  }

  

  if (args.includes("--status")) {
    await showStatus();
    process.exit(0);
  }

  if (args.includes("--setup")) {
    const { runSetupWizard } = await import("./setup/wizard.js");
    await runSetupWizard();
    process.exit(0);
  }

  if (args.includes("--pick-model")) {
    const { runModelPicker } = await import("./setup/model-picker.js");
    await runModelPicker();
    process.exit(0);
  }

  if (args.includes("--configure")) {
    const { runConfigure } = await import("./setup/configure.js");
    await runConfigure();
    process.exit(0);
  }

  if (args.includes("--run")) {
    StructuredLogger.setSink(prettySink);
    await run();
    return;
  }

  // Default: show help
  logger.info('Run "Employee --help" for usage information.');
  logger.info('Run "Employee --run" to start the Employee.');
}

// ─── Status Command ────────────────────────────────────────────

async function showStatus(): Promise<void> {
  const config = loadConfig();
  if (!config) {
    logger.info("Employee is not configured. Run the setup script first.");
    return;
  }

  const dbPath = resolvePath(config.dbPath);
  const db = createDatabase(dbPath);

  const state = db.getAgentState();
  const turnCount = db.getTurnCount();
  const tools = db.getInstalledTools();
  const heartbeats = db.getHeartbeatEntries();
  const skills = db.getSkills(true);
  const children = db.getChildren();
  const registry = db.getRegistryEntry();

  logger.info(`
=== Employee STATUS ===
Name:       ${config.name}
Address:    ${config.walletAddress}
Creator:    ${config.creatorAddress}
Sandbox:    ${config.sandboxId}
State:      ${state}
Turns:      ${turnCount}
Tools:      ${tools.length} installed
Skills:     ${skills.length} active
Heartbeats: ${heartbeats.filter((h) => h.enabled).length} active
Children:   ${children.filter((c) => c.status !== "dead").length} alive / ${children.length} total
Agent ID:   ${registry?.agentId || "not registered"}
Model:      ${config.inferenceModel}
Version:    ${config.version}
========================
`);

  db.close();
}

// ─── Main Run ──────────────────────────────────────────────────

async function run(): Promise<void> {
  logger.info(`[${new Date().toISOString()}] Cofoundator Agent v${VERSION} starting...`);

  // Load config
  let config = loadConfig();
  if (!config) {
    logger.error("No config found. Please create ~/.Employee/Employee.json");
    process.exit(1);
  }

  // Get API key from config or env
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    logger.error("No DeepSeek API key found. Set DEEPSEEK_API_KEY env var.");
    process.exit(1);
  }

  // Initialize database
  const dbPath = resolvePath(config.dbPath);
  const db = createDatabase(dbPath);

  // Create DeepSeek client
  const inference = createInferenceClient({ apiKey });

  // Create identity (local, no wallet)
  const identity: EmployeeIdentity = {
    name: config.name || "cofoundator",
    address: "local",
    
    creatorAddress: "local",
    sandboxId: "local",
    apiKey,
    createdAt: new Date().toISOString(),
    chainType: "local",
    chainIdentity: { address: "local" },
  };

  // Store identity in DB
  db.setIdentity("name", identity.name);
  db.setIdentity("address", identity.address);
  db.setIdentity("creator", identity.creatorAddress);
  db.setIdentity("chainType", "local");
  db.setIdentity("sandbox", "local");

  // Load skills
  const skillsDir = config.skillsDir || "~/.Employee/skills";
  let skills: Skill[] = [];
  try {
    skills = loadSkills(skillsDir, db);
  } catch (err: any) {
    logger.warn(`Skills loading failed: ${err.message}`);
  }

  // Handle graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down...");
    db.setAgentState("sleeping");
    db.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Main Run Loop
  while (true) {
    try {
      await runAgentLoop({
        local: null as any,
        identity,
        config,
        db,
        inference,
        skills,
        onStateChange: (state: AgentState) => {
          logger.info(`State: ${state}`);
        },
        onTurnComplete: (turn) => {
          logger.info(`Turn complete`);
        },
      });

      const state = db.getAgentState();
      if (state === "dead") {
        await sleep(300_000);
        continue;
      }
      if (state === "sleeping") {
        await sleep(60_000);
        continue;
      }
    } catch (err: any) {
      logger.error(`Fatal error: ${err.message}`);
      await sleep(30_000);
    }
  }
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Entry Point ───────────────────────────────────────────────

main().catch((err) => {
  logger.error(`Fatal: ${err.message}`);
  process.exit(1);
});
















