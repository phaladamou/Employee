import type { Provenance } from "./provenance.js";

export interface FreshnessCheck {
  needsVerification: boolean;
  reason: string;
}

export function checkFreshness(provenance: Provenance, claim: string): FreshnessCheck {
  if (provenance.source === "memory") {
    return {
      needsVerification: true,
      reason: "Memory may be stale. Verification required for volatile facts.",
    };
  }
  if (provenance.source === "filesystem" || provenance.source === "command") {
    const age = Date.now() - new Date(provenance.observedAt).getTime();
    if (age > 30000) {
      return {
        needsVerification: true,
        reason: "Filesystem observation is more than 30 seconds old.",
      };
    }
    return { needsVerification: false, reason: "Fresh observation." };
  }
  if (provenance.source === "user") {
    return { needsVerification: false, reason: "User provided directly." };
  }
  return { needsVerification: true, reason: "Unknown provenance." };
}
