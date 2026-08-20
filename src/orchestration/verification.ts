import type { Evidence, VerificationResult } from "./evidence.js";

export class VerificationEngine {
  async verify(evidenceList: Evidence[]): Promise<VerificationResult> {
    const result: VerificationResult = {
      passed: false,
      confidence: 0,
      evidence: evidenceList,
      failures: [],
    };

    for (const evidence of evidenceList) {
      if (evidence.verified) {
        result.confidence += 1;
      } else {
        result.failures.push(evidence.type + ": " + evidence.description);
      }
    }

    if (result.confidence > 0) {
      result.passed = true;
      result.confidence = result.confidence / evidenceList.length;
    }

    return result;
  }
}
