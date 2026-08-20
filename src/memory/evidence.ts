import type { Provenance } from "./provenance.js";

export interface Evidence {
  type: "file" | "command" | "test" | "api" | "artifact" | "observation";
  description: string;
  reference: string;
  verified: boolean;
  timestamp: string;
  provenance?: Provenance;
}

export function createEvidence(
  type: Evidence["type"],
  description: string,
  reference: string,
  provenance?: Provenance
): Evidence {
  return {
    type,
    description,
    reference,
    verified: false,
    timestamp: new Date().toISOString(),
    provenance,
  };
}

export function verifyEvidence(evidence: Evidence): boolean {
  if (!evidence.provenance) return false;
  if (evidence.provenance.source === "memory" && evidence.provenance.volatile) {
    return false; // Memory + volatile = MUST verify with tool
  }
  if (evidence.provenance.source === "command" || evidence.provenance.source === "filesystem") {
    return true;
  }
  return false;
}
