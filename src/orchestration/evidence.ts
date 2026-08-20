export interface Evidence {
  type: "file" | "command" | "test" | "api" | "artifact" | "observation";
  description: string;
  reference: string;
  verified: boolean;
  timestamp: string;
}

export interface VerificationResult {
  passed: boolean;
  confidence: number;
  evidence: Evidence[];
  failures: string[];
}

export function createEvidence(
  type: Evidence["type"],
  description: string,
  reference: string
): Evidence {
  return {
    type,
    description,
    reference,
    verified: false,
    timestamp: new Date().toISOString(),
  };
}

export function createVerificationResult(): VerificationResult {
  return {
    passed: false,
    confidence: 0,
    evidence: [],
    failures: [],
  };
}
