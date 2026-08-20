export function loadApiKeyFromConfig(): string | null {
  return process.env.DEEPSEEK_API_KEY || null;
}
export async function provision(...args: any[]): Promise<any> {
  return { apiKey: process.env.DEEPSEEK_API_KEY || "" };
}







