import type { InferenceClient } from "../../types.js";

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  sourceType?: "primary" | "secondary" | "tertiary" | "unknown";
  credibility?: number;
  relevance?: number;
  evidenceQuality?: number;
  recency?: number;
  reasoning?: string;
}

interface ResearchGap {
  claim: string;
  problem: string;
  priority: "high" | "medium" | "low";
  searchQueries: string[];
}

const MAX_INITIAL_ITERATIONS = 3;
const MAX_INITIAL_SOURCES = 10;
const MAX_GAP_SEARCHES = 5;
const MAX_QUERIES_PER_GAP = 2;
const MAX_TOTAL_SOURCES = 30;
const MAX_FINAL_SOURCES = 20;
const MIN_FINAL_SCORE = 45;

export class WebResearchSkill {
  constructor(private llm: InferenceClient) {}

  async execute(question: string): Promise<string> {
    const complexity = this.analyzeComplexity(question);
    console.log(`[Research] Complexity: ${complexity}`);

    if (complexity === "simple") {
      return this.executeSimpleResearch(question);
    }

    return this.executeFullResearch(question);
  }

  private analyzeComplexity(question: string): "simple" | "complex" {
    const simplePatterns = ["what is", "who is", "when", "where", "define", "definition", "heure", "time", "how to"];
    const questionLower = question.toLowerCase();
    for (const pattern of simplePatterns) {
      if (questionLower.includes(pattern)) return "simple";
    }
    return "complex";
  }

  private async executeSimpleResearch(question: string): Promise<string> {
    const sources = new Map<string, ResearchSource>();
    await this.searchAndCollect(question, sources, 3);
    if (sources.size === 0) return "No results found.";
    const sourceList = Array.from(sources.values());
    const best = sourceList[0];
    return "ANSWER: " + best.title + "\n" + best.snippet + "\nSource: " + best.url;
  }

  private async executeFullResearch(question: string): Promise<string> {
    const sources = new Map<string, ResearchSource>();

    const initialQueries = [question, question + " evidence", question + " primary research"];

    for (let iteration = 0; iteration < initialQueries.length && iteration < MAX_INITIAL_ITERATIONS; iteration++) {
      const query = initialQueries[iteration];
      console.log(`[Research] Initial search ${iteration + 1}/${MAX_INITIAL_ITERATIONS}`);
      await this.searchAndCollect(query, sources, MAX_INITIAL_SOURCES);
      console.log(`[Research] Sources collected: ${sources.size}`);
      if (sources.size >= MAX_INITIAL_SOURCES) break;
    }

    if (sources.size === 0) return "No research results found for: " + question;

    let sourceList = Array.from(sources.values());
    await this.evaluateSources(sourceList, question);
    this.rankSources(sourceList);
    this.logRanking(sourceList, "Initial ranking");

    const gapAnalysis = await this.analyzeGaps(question, sourceList);
    console.log(`[Research] Gaps detected: ${gapAnalysis.length}`);

    const prioritizedGaps = this.prioritizeGaps(gapAnalysis);
    for (const gap of prioritizedGaps) {
      await this.executeGapResearch(gap, sources);
      if (sources.size >= MAX_TOTAL_SOURCES) break;
    }

    sourceList = Array.from(sources.values());
    const unevaluated = sourceList.filter((s) => !s.score);
    await this.evaluateSources(unevaluated, question);

    sourceList = Array.from(sources.values());
    this.rankSources(sourceList);
    const strongSources = sourceList.filter((s) => (s.score ?? 0) >= MIN_FINAL_SCORE);
    const finalSources = (strongSources.length > 0 ? strongSources : sourceList).slice(0, MAX_FINAL_SOURCES);
    this.logRanking(finalSources, "Final ranking");

    return this.synthesize(question, finalSources, gapAnalysis);
  }

  private async searchAndCollect(query: string, sources: Map<string, ResearchSource>, limit: number): Promise<void> {
    const apiKey = process.env.TAVILY_API_KEY || "";
    if (!apiKey) { console.log("[Research] TAVILY_API_KEY missing"); return; }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, query: query, max_results: 10, search_depth: "advanced" })
      });
      const data = await response.json();

      for (const result of data.results || []) {
        if (!result?.url) continue;
        const normalizedUrl = this.normalizeUrl(result.url);
        if (!sources.has(normalizedUrl)) {
          sources.set(normalizedUrl, {
            title: result.title ?? "Untitled source",
            url: result.url,
            snippet: result.content ?? ""
          });
          console.log(`[Research] Found: ${result.title}`);
        }
        if (sources.size >= limit) break;
      }
    } catch (error) {
      console.error(`[Research] Search failed: ${query}`, error);
    }
  }

  private async evaluateSources(sourceList: ResearchSource[], question: string): Promise<void> {
    for (const source of sourceList) {
      if (source.score !== undefined) continue;

      const prompt = `Research question: ${question}
Source title: ${source.title}
Source URL: ${source.url}
Source content: ${source.snippet}

Return ONLY valid JSON:
{"score": number, "sourceType": "primary"|"secondary"|"tertiary"|"unknown", "credibility": number, "relevance": number, "evidenceQuality": number, "recency": number, "reasoning": string}`;

      try {
        const response = await this.llm.chat([
          { role: "system", content: "You are a source evaluation component. Return ONLY valid JSON." },
          { role: "user", content: prompt }
        ]);

        const content = response.message?.content || (response as any).content || "";
        const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        const credibility = this.normalizeScore(parsed.credibility);
        const relevance = this.normalizeScore(parsed.relevance);
        const evidenceQuality = this.normalizeScore(parsed.evidenceQuality);
        const recency = this.normalizeScore(parsed.recency);

        const calculatedScore = Math.round(credibility * 0.3 + relevance * 0.25 + evidenceQuality * 0.3 + recency * 0.15);

        source.score = typeof parsed.score === "number" ? this.normalizeScore(parsed.score) : calculatedScore;
        source.sourceType = ["primary", "secondary", "tertiary", "unknown"].includes(parsed.sourceType) ? parsed.sourceType : "unknown";
        source.credibility = credibility;
        source.relevance = relevance;
        source.evidenceQuality = evidenceQuality;
        source.recency = recency;
        source.reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "No reasoning provided.";

        console.log(`[Research] Evaluated: ${source.title} -> ${source.score}/100`);
      } catch {
        source.score = 0;
        source.sourceType = "unknown";
        source.reasoning = "Evaluation failed.";
      }
    }
  }

  private rankSources(sourceList: ResearchSource[]): void {
    sourceList.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  private logRanking(sources: ResearchSource[], label: string): void {
    console.log(`[Research] ${label}:`);
    for (const source of sources) {
      console.log(`${source.score ?? 0}/100 - ${source.title}`);
    }
  }

  private async analyzeGaps(question: string, sources: ResearchSource[]): Promise<ResearchGap[]> {
    const sourceContext = sources.slice(0, 10).map((s, i) =>
      `Source ${i + 1}\nTitle: ${s.title}\nURL: ${s.url}\nScore: ${s.score ?? "unknown"}/100`
    ).join("\n");

    const prompt = `Research question: ${question}\n\nAvailable evidence:\n${sourceContext}\n\nIdentify 3-5 gaps. Return ONLY JSON:\n{"gaps": [{"claim": "string", "problem": "string", "priority": "high"|"medium"|"low", "searchQueries": ["string"]}]}`;

    try {
      const response = await this.llm.chat([
        { role: "system", content: "You are a gap analyzer. Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ]);
      const content = response.message?.content || (response as any).content || "";
      const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed.gaps)) return [];

      const gaps: ResearchGap[] = [];
      for (const item of parsed.gaps) {
        if (!item || typeof item !== "object") continue;
        const claim = typeof item.claim === "string" ? item.claim.trim() : "";
        const problem = typeof item.problem === "string" ? item.problem.trim() : "";
        const priority: ResearchGap["priority"] = ["high", "medium", "low"].includes(item.priority) ? item.priority : "medium";
        const searchQueries = Array.isArray(item.searchQueries)
          ? item.searchQueries.filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 3)
          : [];
        if (claim && problem) gaps.push({ claim, problem, priority, searchQueries });
      }
      return gaps.slice(0, 5);
    } catch {
      return [];
    }
  }

  private prioritizeGaps(gaps: ResearchGap[]): ResearchGap[] {
    const priorityWeight: Record<ResearchGap["priority"], number> = { high: 3, medium: 2, low: 1 };
    return [...gaps]
      .filter((gap) => gap.priority === "high" || gap.priority === "medium")
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
      .slice(0, MAX_GAP_SEARCHES);
  }

  private async executeGapResearch(gap: ResearchGap, sources: Map<string, ResearchSource>): Promise<void> {
    const queries = gap.searchQueries.slice(0, MAX_QUERIES_PER_GAP);
    for (const query of queries) {
      if (sources.size >= MAX_TOTAL_SOURCES) return;
      console.log(`[Research] Targeted search: ${query}`);
      await this.searchAndCollect(query, sources, MAX_TOTAL_SOURCES);
    }
  }

  private normalizeScore(value: unknown): number {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private normalizeUrl(url: string): string {
    return url.trim().toLowerCase().replace(/\/$/, "");
  }

  private synthesize(question: string, sources: ResearchSource[], gaps: ResearchGap[]): string {
    const sourceContext = sources.map((s, i) =>
      `Source ${i + 1}\nTitle: ${s.title}\nURL: ${s.url}\nScore: ${s.score ?? 0}/100\nType: ${s.sourceType ?? "unknown"}`
    ).join("\n\n");

    const gapContext = gaps.length > 0
      ? gaps.map((g, i) => `${i + 1}. ${g.claim} (${g.priority}): ${g.problem}`).join("\n")
      : "No significant gaps detected.";

    return `RESEARCH SYNTHESIS\n\nQuestion: ${question}\n\nSources used: ${sources.length}\nGaps identified: ${gaps.length}\n\nSOURCES:\n${sourceContext}\n\nGAPS:\n${gapContext}`;
  }
}
