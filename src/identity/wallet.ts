import path from "path";
export function getEmployeeDir(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || ".", ".Employee");
}
export async function getWallet(chainType?: any): Promise<any> {
  return { account: null, chainIdentity: { address: "local", chainType: "local" }, chainType: "local", isNew: false };
}







