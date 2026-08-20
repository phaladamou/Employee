export type FailureType = 
  | "transient" 
  | "permission" 
  | "invalid_tool" 
  | "bad_plan" 
  | "missing_info" 
  | "environment";

export interface RecoveryDecision {
  action: "retry" | "repair" | "replan" | "fail";
  reason: string;
}

export function classifyFailure(error: string): FailureType {
  if (error.includes("fetch failed") || error.includes("timeout")) return "transient";
  if (error.includes("permission") || error.includes("blocked")) return "permission";
  if (error.includes("not a function") || error.includes("undefined")) return "invalid_tool";
  if (error.includes("missing") || error.includes("not found")) return "missing_info";
  return "environment";
}

export function decideRecovery(type: FailureType, retryCount: number): RecoveryDecision {
  if (type === "transient" && retryCount < 3) {
    return { action: "retry", reason: "Transient error, retry allowed" };
  }
  if (type === "invalid_tool") {
    return { action: "repair", reason: "Tool issue, repair required" };
  }
  if (type === "bad_plan" || type === "missing_info") {
    return { action: "replan", reason: "Plan needs revision" };
  }
  return { action: "fail", reason: "Unrecoverable failure" };
}
