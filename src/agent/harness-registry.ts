import type { AgentHarness } from "./harness-types.js";
import { CodingHarness } from "./harnesses/coding-harness.js";
import { GeneralHarness } from "./harnesses/general-harness.js";
import { OrchestratorHarness } from "./harnesses/orchestrator-harness.js";

type HarnessConstructor = new () => AgentHarness;

const DEFAULT_ROLE_MAP: Record<string, HarnessConstructor> = {
  executor: CodingHarness,
  debugger: CodingHarness,
  architect: CodingHarness,
  "code-reviewer": CodingHarness,
  tester: CodingHarness,
  devops: CodingHarness,
  developer: CodingHarness,
  engineer: CodingHarness,

  orchestrator: OrchestratorHarness,
  planner: OrchestratorHarness,
  critic: OrchestratorHarness,
  coordinator: OrchestratorHarness,

  generalist: GeneralHarness,
  researcher: GeneralHarness,
  marketer: GeneralHarness,
  "social-manager": GeneralHarness,
  "domain-manager": GeneralHarness,
  "financial-analyst": GeneralHarness,
  writer: GeneralHarness,
  analyst: GeneralHarness,
};

export class HarnessRegistry {
  private readonly roleMap: Map<string, HarnessConstructor>;
  private fallback: HarnessConstructor;

  constructor() {
    this.roleMap = new Map(Object.entries(DEFAULT_ROLE_MAP));
    this.fallback = GeneralHarness;
  }

  register(role: string, constructor: HarnessConstructor): void {
    this.roleMap.set(role.toLowerCase().trim(), constructor);
  }

  setFallback(constructor: HarnessConstructor): void {
    this.fallback = constructor;
  }

  createForRole(role: string | null | undefined): AgentHarness {
    const normalized = (role ?? "generalist").toLowerCase().trim();
    const Constructor = this.roleMap.get(normalized) ?? this.fallback;
    return new Constructor();
  }

  getHarnessIdForRole(role: string | null | undefined): string {
    return this.createForRole(role).id;
  }

  listMappings(): Array<{ role: string; harnessId: string }> {
    const mappings: Array<{ role: string; harnessId: string }> = [];
    for (const [role, Constructor] of this.roleMap) {
      mappings.push({ role, harnessId: new Constructor().id });
    }
    return mappings;
  }
}







