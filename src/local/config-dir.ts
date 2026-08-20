import fs from "fs";
import path from "path";

export function getEmployeeDir(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || ".", ".Employee");
}

export function ensureEmployeeDir(): void {
  const dir = getEmployeeDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}







