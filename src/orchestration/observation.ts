export interface Observation {
  actionId: string;
  tool: string;
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  durationMs?: number;
  timestamp: string;
}

export function createObservation(tool: string, success: boolean, details?: Partial<Observation>): Observation {
  return {
    actionId: Date.now().toString(),
    tool,
    success,
    exitCode: details?.exitCode,
    stdout: details?.stdout,
    stderr: details?.stderr,
    durationMs: details?.durationMs,
    timestamp: new Date().toISOString(),
  };
}

export function formatObservation(obs: Observation): string {
  return [
    "[OBSERVATION]",
    "  tool: " + obs.tool,
    "  success: " + obs.success,
    obs.exitCode !== undefined ? "  exit_code: " + obs.exitCode : "",
    obs.stdout ? "  stdout: " + obs.stdout.slice(0, 100) : "",
    obs.stderr ? "  stderr: " + obs.stderr.slice(0, 100) : "",
  ].filter(Boolean).join("\n");
}
