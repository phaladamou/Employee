export type ProvenanceSource = "memory" | "filesystem" | "command" | "tool" | "user" | "external";

export interface Provenance {
  source: ProvenanceSource;
  observedAt: string;
  confidence: number;
  volatile: boolean;
}

export function createProvenance(source: ProvenanceSource, volatile: boolean): Provenance {
  return {
    source,
    observedAt: new Date().toISOString(),
    confidence: 1.0,
    volatile,
  };
}

export function isVolatile(provenance: Provenance): boolean {
  return provenance.volatile;
}

export function isStale(provenance: Provenance, maxAgeMs: number = 60000): boolean {
  const age = Date.now() - new Date(provenance.observedAt).getTime();
  return provenance.volatile && age > maxAgeMs;
}
