import type { ChainType, ChainIdentity } from "./identity/chain.js";

// --- Identity ----------------------------------------------------

export interface EmployeeIdentity {
  name: string;
  address: string;
  creatorAddress: string;
  sandboxId: string;
  apiKey: string;
  createdAt: string;
  chainType?: ChainType;
  chainIdentity?: ChainIdentity;
}

// --- Configuration -----------------------------------------------

export interface TreasuryPolicy {
  maxSingleTransferCents: number;
  maxHourlyTransferCents: number;
  maxDailyTransferCents: number;
  minimumReserveCents: number;
  maxX402PaymentCents: number;
  x402AllowedDomains: string[];
  transferCooldownMs: number;
  maxTransfersPerTurn: number;
  maxInferenceDailyCents: number;
  requireConfirmationAboveCents: number;
}

export const DEFAULT_TREASURY_POLICY: TreasuryPolicy = {
  maxSingleTransferCents: 5000,
  maxHourlyTransferCents: 10000,
  maxDailyTransferCents: 25000,
  minimumReserveCents: 1000,
  maxX402PaymentCents: 100,
  x402AllowedDomains: ["localhost"],
  transferCooldownMs: 0,
  maxTransfersPerTurn: 2,
  maxInferenceDailyCents: 50000,
  requireConfirmationAboveCents: 1000,
};

export interface ModelStrategyConfig {
  inferenceModel: string;
  lowComputeModel: string;
  criticalModel: string;
  maxTokensPerTurn: number;
  hourlyBudgetCents: number;
  sessionBudgetCents: number;
  perCallCeilingCents: number;
  enableModelFallback: boolean;
}

export const DEFAULT_MODEL_STRATEGY_CONFIG: ModelStrategyConfig = {
  inferenceModel: "deepseek-chat",
  lowComputeModel: "deepseek-chat",
  criticalModel: "deepseek-chat",
  maxTokensPerTurn: 4096,
  hourlyBudgetCents: 0,
  sessionBudgetCents: 0,
  perCallCeilingCents: 0,
  enableModelFallback: true,
};

export interface SoulConfig {
  soulAlignmentThreshold: number;
  requireCreatorApprovalForPurposeChange: boolean;
  enableSoulReflection: boolean;
}

export const DEFAULT_SOUL_CONFIG: SoulConfig = {
  soulAlignmentThreshold: 0.5,
  requireCreatorApprovalForPurposeChange: false,
  enableSoulReflection: true,
};

export interface EmployeeConfig {
  name: string;
  genesisPrompt: string;
  creatorMessage?: string;
  creatorAddress: string;
  registeredWithlocal?: boolean;
  sandboxId: string;
  LocalApiUrl?: string;
  LocalApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  ollamaBaseUrl?: string;
  inferenceModel: string;
  maxTokensPerTurn: number;
  heartbeatConfigPath?: string;
  dbPath: string;
  logLevel: "debug" | "info" | "warn" | "error";
  walletAddress?: string;
  version: string;
  skillsDir?: string;
  maxChildren?: number;
  maxTurnsPerCycle?: number;
  parentAddress?: string;
  socialRelayUrl?: string;
  rpcUrl?: string;
  treasuryPolicy?: TreasuryPolicy;
  modelStrategy?: ModelStrategyConfig;
  soulConfig?: SoulConfig;
  chainType?: ChainType;
}

export const DEFAULT_CONFIG: Partial<EmployeeConfig> = {
  inferenceModel: "deepseek-chat",
  maxTokensPerTurn: 4096,
  dbPath: "~/.employee/state.db",
  logLevel: "info",
  version: "0.2.1",
  skillsDir: "~/.employee/skills",
  maxChildren: 3,
  maxTurnsPerCycle: 5,
};

export type AgentState = "setup" | "waking" | "running" | "sleeping" | "low_compute" | "critical" | "dead";

export interface AgentTurn {
  id: string;
  timestamp: string;
  state: AgentState;
  input?: string;
  inputSource?: string;
  thinking: string;
  toolCalls: ToolCallResult[];
  tokenUsage: TokenUsage;
  costCents: number;
}

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: string;
  durationMs: number;
  error?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type RiskLevel = "safe" | "caution" | "dangerous" | "forbidden";
export type ToolCategory = "vm" | "financial" | "memory" | "system" | "self_mod" | "survival" | "skills" | "git" | "registry" | "replication";

export interface EmployeeTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  riskLevel: RiskLevel;
  category: ToolCategory;
}

export interface ToolContext {
  identity: EmployeeIdentity;
  config: EmployeeConfig;
  db: EmployeeDatabase;
  inference: InferenceClient;
  social?: SocialClientInterface;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: InferenceToolCall[];
}

export interface InferenceToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface InferenceResponse {
  id: string;
  model: string;
  message: ChatMessage;
  toolCalls?: InferenceToolCall[];
  usage: TokenUsage;
  finishReason: string;
}

export interface InferenceClient {
  chat(messages: ChatMessage[], options?: any): Promise<InferenceResponse>;
  setLowComputeMode(enabled: boolean): void;
  getDefaultModel(): string;
}

export type WorkingMemoryType = "goal" | "observation" | "plan" | "task" | "note";
export type TurnClassification = "strategic" | "productive" | "communication" | "maintenance" | "idle" | "error";
export type SemanticCategory = "self" | "environment" | "financial" | "agent" | "domain" | "procedural_ref" | "creator";

export interface WorkingMemoryEntry {
  id: string;
  sessionId: string;
  content: string;
  contentType: WorkingMemoryType;
  priority: number;
  tokenCount: number;
  expiresAt?: string | null;
  sourceTurn?: string | null;
  createdAt: string;
}

export interface EpisodicMemoryEntry {
  id: string;
  sessionId: string;
  eventType: string;
  summary: string;
  detail?: string | null;
  outcome: "success" | "failure" | "partial" | "neutral" | null;
  importance: number;
  embeddingKey?: string | null;
  tokenCount?: number;
  accessedCount?: number;
  lastAccessedAt?: string | null;
  classification: TurnClassification;
  createdAt: string;
}

export interface SemanticMemoryEntry {
  id: string;
  category: SemanticCategory;
  key: string;
  value: string;
  confidence: number;
  source?: string;
  embeddingKey?: string | null;
  lastVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProceduralStep {
  order: number;
  description: string;
  tool: string | null;
  argsTemplate: Record<string, string> | null;
  expectedOutcome: string | null;
  onFailure: string | null;
}

export interface ProceduralMemoryEntry {
  id: string;
  name: string;
  description: string;
  steps: ProceduralStep[];
  successCount: number;
  failureCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipMemoryEntry {
  id: string;
  entityAddress: string;
  entityName: string | null;
  relationshipType: string;
  trustScore: number;
  interactionCount: number;
  lastInteractionAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummaryEntry {
  id: string;
  sessionId: string;
  summary: string;
  keyDecisions: string[];
  toolsUsed: string[];
  outcomes: string[];
  turnCount: number;
  totalTokens: number;
  totalCostCents: number;
  createdAt: string;
}

export interface MemoryRetrievalResult {
  workingMemory: WorkingMemoryEntry[];
  episodicMemory: EpisodicMemoryEntry[];
  semanticMemory: SemanticMemoryEntry[];
  proceduralMemory: ProceduralMemoryEntry[];
  relationships: RelationshipMemoryEntry[];
  totalTokens: number;
}

export interface MemoryBudget {
  workingMemoryTokens: number;
  episodicMemoryTokens: number;
  semanticMemoryTokens: number;
  proceduralMemoryTokens: number;
  relationshipMemoryTokens: number;
}

export const DEFAULT_MEMORY_BUDGET: MemoryBudget = {
  workingMemoryTokens: 1500,
  episodicMemoryTokens: 3000,
  semanticMemoryTokens: 3000,
  proceduralMemoryTokens: 1500,
  relationshipMemoryTokens: 1000,
};

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  context?: Record<string, unknown>;
  error?: { message: string; stack?: string; code?: string };
}

export type MetricType = "counter" | "gauge" | "histogram";

export interface MetricEntry {
  name: string;
  value: number;
  type: MetricType;
  labels: Record<string, string>;
  timestamp: string;
}

export interface MetricSnapshot {
  counters: Map<string, number>;
  gauges: Map<string, number>;
  histograms: Map<string, number[]>;
}

export interface MetricSnapshotRow {
  id: string;
  snapshotAt: string;
  metricsJson: string;
  alertsJson: string;
  createdAt: string;
}

export type AlertSeverity = "warning" | "critical";

export interface AlertRule {
  name: string;
  severity: AlertSeverity;
  message: string;
  cooldownMs: number;
  condition: (metrics: MetricSnapshot) => boolean;
}

export interface AlertEvent {
  rule: string;
  severity: AlertSeverity;
  message: string;
  firedAt: string;
  metricValues: Record<string, number>;
}

export type ModelProvider = "openai" | "anthropic" | "deepseek" | "ollama" | "other";

export interface ModelEntry {
  modelId: string;
  provider: ModelProvider;
  displayName: string;
  tierMinimum: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  maxTokens: number;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  parameterStyle: string;
  enabled: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModelRegistryRow {
  modelId: string;
  provider: string;
  displayName: string;
  tierMinimum: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  maxTokens: number;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  parameterStyle: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ChildStatus = "spawning" | "running" | "sleeping" | "dead" | "unknown" | "requested" | "sandbox_created" | "runtime_ready" | "wallet_verified" | "funded" | "starting" | "healthy" | "unhealthy" | "stopped" | "failed" | "cleaned_up";

export interface ChildEmployee {
  id: string;
  name: string;
  address: string;
  sandboxId: string;
  genesisPrompt: string;
  creatorMessage?: string;
  fundedAmountCents: number;
  status: ChildStatus;
  createdAt: string;
  lastChecked?: string;
  chainType?: ChainType;
}

export interface HeartbeatEntry {
  name: string;
  schedule: string;
  task: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  params?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  type: string;
  amountCents?: number;
  balanceAfterCents?: number;
  description: string;
  timestamp: string;
}

export interface InstalledTool {
  id: string;
  name: string;
  type: "builtin" | "mcp" | "custom";
  config?: Record<string, unknown>;
  installedAt: string;
  enabled: boolean;
}

export interface ModificationEntry {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  filePath?: string;
  diff?: string;
  reversible: boolean;
}

export interface RegistryEntry {
  agentId: string;
  agentURI: string;
  chain: string;
  contractAddress: string;
  txHash: string;
  registeredAt: string;
}

export interface ReputationEntry {
  id: string;
  fromAgent: string;
  toAgent: string;
  score: number;
  comment: string;
  txHash?: string;
  timestamp: string;
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  signedAt: string;
  createdAt: string;
  replyTo?: string;
}

export type PolicyAction = "allow" | "deny" | "quarantine";
export type SpendCategory = "transfer" | "x402" | "inference" | "other";
export type AuthorityLevel = "system" | "agent" | "external";

export interface HeartbeatScheduleRow {
  taskName: string;
  cronExpression: string;
  intervalMs: number | null;
  enabled: number;
  priority: number;
  timeoutMs: number;
  maxRetries: number;
  tierMinimum: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastResult: string | null;
  lastError: string | null;
  runCount: number;
  failCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
}

export interface HeartbeatHistoryRow {
  id: string;
  taskName: string;
  startedAt: string;
  completedAt: string | null;
  result: string;
  durationMs: number | null;
  error: string | null;
  idempotencyKey: string | null;
}

export interface WakeEventRow {
  id: number;
  source: string;
  reason: string;
  payload: string;
  consumedAt: string | null;
  createdAt: string;
}

export interface SoulModel {
  format: "soul/v1";
  version: number;
  updatedAt: string;
  name: string;
  address: string;
  creator: string;
  bornAt: string;
  constitutionHash: string;
  genesisPromptOriginal: string;
  genesisAlignment: number;
  lastReflected: string;
  corePurpose: string;
  values: string[];
  behavioralGuidelines: string[];
  personality: string;
  boundaries: string[];
  strategy: string;
  capabilities: string;
  relationships: string;
  financialCharacter: string;
  rawContent: string;
  contentHash: string;
}

export interface SoulValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: SoulModel;
}

export interface SoulHistoryRow {
  id: string;
  version: number;
  content: string;
  contentHash: string;
  changeSource: string;
  changeReason: string | null;
  previousVersionId: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export interface SoulReflection {
  currentAlignment: number;
  suggestedUpdates: Array<{ section: string; reason: string; suggestedContent: string }>;
  autoUpdated: string[];
}

export interface InferenceCostRow {
  id: string;
  sessionId: string;
  turnId: string | null;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  tier: string;
  taskType: string;
  cacheHit: boolean;
  createdAt: string;
}

export interface ChildLifecycleEventRow {
  id: string;
  childId: string;
  fromState: string;
  toState: string;
  reason: string | null;
  metadata: string;
  createdAt: string;
}

export type ChildLifecycleState = "requested" | "sandbox_created" | "runtime_ready" | "wallet_verified" | "funded" | "starting" | "healthy" | "unhealthy" | "stopped" | "failed" | "cleaned_up";

export interface OnchainTransactionRow {
  id: string;
  txHash: string;
  chain: string;
  operation: string;
  status: "pending" | "confirmed" | "failed";
  gasUsed: number | null;
  metadata: string;
  createdAt: string;
}

export interface DiscoveredAgentCacheRow {
  agentAddress: string;
  agentCard: string;
  fetchedFrom: string;
  cardHash: string;
  validUntil: string | null;
  fetchCount: number;
  lastFetchedAt: string;
  createdAt: string;
}

export interface SocialClientInterface {
  send(to: string, content: string, replyTo?: string): Promise<{ id: string }>;
  poll(cursor?: string, limit?: number): Promise<{ messages: InboxMessage[]; nextCursor?: string }>;
  unreadCount(): Promise<number>;
}

export interface SignedMessagePayload {
  from: string;
  to: string;
  content: string;
  signed_at: string;
  signature: string;
  reply_to?: string;
}

export interface MessageValidationResult {
  valid: boolean;
  errors: string[];
}

export interface Skill {
  name: string;
  description: string;
  autoActivate: boolean;
  requires?: { bins?: string[]; env?: string[] };
  instructions: string;
  source: "builtin" | "git" | "url" | "self";
  path: string;
  enabled: boolean;
  installedAt: string;
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  "auto-activate"?: boolean;
  requires?: { bins?: string[]; env?: string[] };
}

export type SkillSource = "builtin" | "git" | "url" | "self";

export interface EmployeeDatabase {
  getIdentity(key: string): string | undefined;
  setIdentity(key: string, value: string): void;
  insertTurn(turn: AgentTurn): void;
  getRecentTurns(limit: number): AgentTurn[];
  getTurnById(id: string): AgentTurn | undefined;
  getTurnCount(): number;
  insertToolCall(turnId: string, call: ToolCallResult): void;
  getToolCallsForTurn(turnId: string): ToolCallResult[];
  getHeartbeatEntries(): HeartbeatEntry[];
  upsertHeartbeatEntry(entry: HeartbeatEntry): void;
  updateHeartbeatLastRun(name: string, timestamp: string): void;
  insertTransaction(txn: Transaction): void;
  getRecentTransactions(limit: number): Transaction[];
  getInstalledTools(): InstalledTool[];
  installTool(tool: InstalledTool): void;
  removeTool(id: string): void;
  insertModification(mod: ModificationEntry): void;
  getRecentModifications(limit: number): ModificationEntry[];
  getKV(key: string): string | undefined;
  setKV(key: string, value: string): void;
  deleteKV(key: string): void;
  getSkills(enabledOnly?: boolean): Skill[];
  getSkillByName(name: string): Skill | undefined;
  upsertSkill(skill: Skill): void;
  removeSkill(name: string): void;
  getChildren(): ChildEmployee[];
  getChildById(id: string): ChildEmployee | undefined;
  insertChild(child: ChildEmployee): void;
  updateChildStatus(id: string, status: ChildStatus): void;
  getRegistryEntry(): RegistryEntry | undefined;
  setRegistryEntry(entry: RegistryEntry): void;
  insertReputation(entry: ReputationEntry): void;
  getReputation(agentAddress?: string): ReputationEntry[];
  insertInboxMessage(msg: InboxMessage): void;
  getUnprocessedInboxMessages(limit: number): InboxMessage[];
  markInboxMessageProcessed(id: string): void;
  getAgentState(): AgentState;
  setAgentState(state: AgentState): void;
  runTransaction<T>(fn: () => T): T;
  close(): void;
  raw: import("better-sqlite3").Database;
}

export interface localClient {
  exec(command: string, timeout?: number): Promise<ExecResult>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  exposePort(port: number): Promise<PortInfo>;
  removePort(port: number): Promise<void>;
  getCreditsBalance(): Promise<number>;
  transferCredits(toAddress: string, amountCents: number, note?: string): Promise<CreditTransferResult>;
  listModels(): Promise<ModelInfo[]>;
  getUsdcBalance(address?: string): Promise<number>;
  topupCredits(params?: any): Promise<any>;
  x402Fetch(url: string, options?: any): Promise<any>;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PortInfo {
  port: number;
  publicUrl: string;
  sandboxId: string;
}

export interface CreditTransferResult {
  transferId: string;
  status: string;
  toAddress: string;
  amountCents: number;
  balanceAfterCents?: number;
}

export interface ModelInfo {
  id: string;
  provider: string;
  pricing: { inputPerMillion: number; outputPerMillion: number };
}

export type InputSource = "heartbeat" | "creator" | "agent" | "system" | "wakeup";

export interface SpendTrackerInterface {
  recordSpend(entry: any): void;
  getHourlySpend(category: string): number;
  getDailySpend(category: string): number;
  getTotalSpend(category: string, since: Date): number;
  checkLimit(amount: number, category: string, limits: TreasuryPolicy): { allowed: boolean; reason?: string };
  pruneOldRecords(retentionDays: number): number;
}

export interface FinancialState {
  creditsCents: number;
  usdcBalance: number;
  lastChecked: string;
}

export interface TokenBudget {
  total: number;
  systemPrompt: number;
  recentTurns: number;
  toolResults: number;
  memoryRetrieval: number;
}

export const DEFAULT_TOKEN_BUDGET: TokenBudget = {
  total: 100000,
  systemPrompt: 20000,
  recentTurns: 50000,
  toolResults: 20000,
  memoryRetrieval: 10000,
};

export type SurvivalTier = "dead" | "critical" | "low_compute" | "normal" | "high";

