import os from "os";

export interface EnvironmentProfile {
  os: string;
  shell: string;
  workingDirectory: string;
  capabilities: string[];
  unavailable: string[];
  homeDirectory: string;
}

export function detectEnvironment(): EnvironmentProfile {
  const platform = os.platform();
  const homeDir = os.homedir();
  const cwd = process.cwd();

  let shell = "cmd.exe";
  let osName = "Unknown";

  if (platform === "win32") {
    osName = "Windows";
    shell = "cmd.exe";
  } else if (platform === "linux") {
    osName = "Linux";
    shell = "bash";
  } else if (platform === "darwin") {
    osName = "macOS";
    shell = "zsh";
  }

  const capabilities = ["filesystem", "process execution", "command execution"];
  const unavailable: string[] = [];

  if (platform !== "win32") {
    unavailable.push("Windows commands (dir, find)");
  } else {
    unavailable.push("Unix commands (pwd, ls, grep)");
  }

  return {
    os: osName,
    shell: shell,
    workingDirectory: cwd,
    capabilities: capabilities,
    unavailable: unavailable,
    homeDirectory: homeDir,
  };
}

export function formatEnvironmentProfile(profile: EnvironmentProfile): string {
  return [
    "## ENVIRONMENT PROFILE",
    "OS: " + profile.os,
    "Shell: " + profile.shell,
    "Working directory: " + profile.workingDirectory,
    "Home: " + profile.homeDirectory,
    "Capabilities: " + profile.capabilities.join(", "),
    "Unavailable: " + profile.unavailable.join(", "),
  ].join("\n");
}
