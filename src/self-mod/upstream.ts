export async function checkUpstream(): Promise<{ behind: number }> { return { behind: 0 }; }
export async function getRepoInfo(): Promise<{ repo: string }> { return { repo: "local" }; }
export async function getUpstreamDiffs(): Promise<any[]> { return []; }







