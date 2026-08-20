import { createDatabase } from "./dist/state/database.js";
import { resolvePath } from "./dist/config.js";
import { runAgentLoop } from "./dist/agent/loop.js";
import { createDeepSeekInference } from "./dist/inference/deepseek.js";
import { createlocalClient } from "./dist/local/local-client.js";
import { StructuredLogger } from "./dist/observability/logger.js";
import { prettySink } from "./dist/observability/pretty-sink.js";
import os from "os";
import path from "path";

StructuredLogger.setSink(prettySink);

const apiKey = process.env.DEEPSEEK_API_KEY;
const dbPath = path.join(os.homedir(), ".employee", "employee.db");
const db = createDatabase(dbPath);
const inference = createDeepSeekInference(apiKey);
const localServices = createlocalClient({ apiKey });

db.raw.prepare("UPDATE inbox_messages SET status = 'received', retry_count = 0").run();

await runAgentLoop({
  identity: {
    name: "Employee",
    address: "local",
    account: null,
    creatorAddress: "local",
    sandboxId: "local",
    apiKey,
    createdAt: new Date().toISOString(),
    chainType: "local",
    chainIdentity: { address: "local" },
  },
  config: {
    name: "Employee",
    genesisPrompt: "Tu es un employé IA autonome.",
    inferenceModel: "deepseek-chat",
    maxTokensPerTurn: 1000,
    dbPath: dbPath,
  },
  db,
  local: localServices,
  inference,
  skills: [],
  onStateChange: (state) => console.log("State:", state),
  onTurnComplete: (turn) => console.log("Turn:", turn.thinking?.substring(0, 100)),
});

db.close();
