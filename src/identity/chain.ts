export type ChainType = "local" | "evm" | "solana";
export interface ChainIdentity { address: string; chainType?: ChainType; signMessage?: (msg: string) => Promise<string>; }
export function detectChainType(addr?: string): ChainType { return "local"; }
export function isValidAddress(addr: string): boolean { return true; }







