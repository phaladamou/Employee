import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function detectShell(command: string): string {
  // Si la commande contient des commandes PowerShell
  if (command.includes("Get-ChildItem") || command.includes("Set-Content") || command.includes("Test-Path")) {
    return "cmd.exe";
  }
  // Si la commande contient des commandes bash
  if (command.includes("&&") || command.includes("2>/dev/null") || command.includes("pwd") || command.includes("ls -la")) {
    return "cmd.exe";
  }
  // Par défaut, PowerShell
  return "cmd.exe";
}

export function createlocalClient(config: any) {
  return {
    async getCreditsBalance(): Promise<number> { return 0; },
    async registerEmployee(...args: any[]): Promise<any> { return null; },
    async getUsdcBalance(address?: string): Promise<number> { return 0; },
    async topupCredits(...args: any[]): Promise<any> { return { success: false }; },
    async x402Fetch(url: string, options?: any): Promise<any> { return fetch(url, options); },
    
    async exec(command: string, timeoutMs?: number): Promise<{ stdout: string; stderr: string; exitCode: number }> {
      try {
        const shell = detectShell(command);
        const stdout = execSync(command, { 
          timeout: timeoutMs || 10000,
          encoding: 'utf-8',
          shell: shell,
        });
        return { stdout, stderr: "", exitCode: 0 };
      } catch (err: any) {
        return { stdout: "", stderr: err.message, exitCode: err.status || 1 };
      }
    },
    
    async readFile(filePath: string): Promise<string> {
      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch {
        return "";
      }
    },
    
    async writeFile(filePath: string, content: string): Promise<{ success: boolean }> {
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
      } catch {
        return { success: false };
      }
    },
    
    async listDir(dirPath: string): Promise<string[]> {
      try {
        return fs.readdirSync(dirPath);
      } catch {
        return [];
      }
    },
  };
}

