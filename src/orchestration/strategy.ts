export interface Strategy {
  name: string;
  description: string;
  toolsUsed: string[];
  successRate: number;
  lastUsed: string | null;
}

export class StrategyEngine {
  private strategies: Map<string, Strategy[]> = new Map();

  recordStrategy(missionType: string, strategy: Strategy): void {
    const existing = this.strategies.get(missionType) || [];
    existing.push(strategy);
    this.strategies.set(missionType, existing);
  }

  getBestStrategy(missionType: string): Strategy | null {
    const strategies = this.strategies.get(missionType) || [];
    if (strategies.length === 0) return null;
    
    return strategies.sort((a, b) => b.successRate - a.successRate)[0];
  }

  getFailedStrategies(missionType: string): Strategy[] {
    const strategies = this.strategies.get(missionType) || [];
    return strategies.filter(s => s.successRate < 0.5);
  }
}
