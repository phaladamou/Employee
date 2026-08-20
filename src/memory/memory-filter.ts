import type { MemoryRetrievalResult } from "../types.js";

export function filterRelevantMemories(memories: MemoryRetrievalResult, missionContent: string, maxTokens: number = 2000): MemoryRetrievalResult {
  const keywords = missionContent.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const score = (text: string): number => {
    const lower = text.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1;
    }
    return score;
  };

  const filterAndSort = (entries: any[]) => {
    return entries
      .map(e => ({ entry: e, score: score(e.summary || e.content || "") }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.entry);
  };

  return {
    workingMemory: memories.workingMemory.slice(0, 2),
    episodicMemory: filterAndSort(memories.episodicMemory),
    semanticMemory: filterAndSort(memories.semanticMemory),
    proceduralMemory: filterAndSort(memories.proceduralMemory),
    relationships: memories.relationships.slice(0, 1),
    totalTokens: Math.min(memories.totalTokens, maxTokens),
  };
}
