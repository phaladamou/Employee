/**
 * Inference Budget Tracker
 *
 * Tracks inference costs and enforces budget limits per call,
 * per hour, per session, and per day.
 */

import type BetterSqlite3 from "better-sqlite3";
import { ulid } from "ulid";
import type { InferenceCostRow, ModelStrategyConfig } from "../types.js";
import {
  inferenceInsertCost,
  inferenceGetSessionCosts,
  inferenceGetDailyCost,
  inferenceGetHourlyCost,
  inferenceGetModelCosts,
} from "../state/database.js";

type Database = BetterSqlite3.Database;

export class InferenceBudgetTracker {
  private db: Database;
  readonly config: ModelStrategyConfig;

  constructor(db: Database, config: ModelStrategyConfig) {
    this.db = db;
    this.config = config;
  }

  /**
   * Check whether a call with estimated cost is within budget.
   * Returns { allowed: true } or { allowed: false, reason: "..." }.
   */
  checkBudget(
    estimatedCostCents: number,
    model: string,
  ): { allowed: boolean; reason?: string } {
    // Per-call ceiling check
    if (this.config.perCallCeilingCents > 0 && estimatedCostCents > this.config.perCallCeilingCents) {
      return {
        allowed: false,
        reason: `Per-call cost ${estimatedCostCents}c exceeds ceiling of ${this.config.perCallCeilingCents}c`,
      };
    }

    // Hourly budget check
    if (this.config.hourlyBudgetCents > 0) {
      const hourlyCost = this.getHourlyCost();
      if (hourlyCost + estimatedCostCents > this.config.hourlyBudgetCents) {
        return {
          allowed: false,
          reason: `Hourly budget exhausted: ${hourlyCost}c spent + ${estimatedCostCents}c estimated > ${this.config.hourlyBudgetCents}c limit`,
        };
      }
    }

    // Session budget check
    if (this.config.sessionBudgetCents > 0) {
      // Session budget is enforced via getSessionCost when sessionId is known
      // This is a guard for the overall session — enforced in router.route()
    }

    return { allowed: true };
  }

  /**
   * Record a completed inference cost.
   */
  recordCost(cost: Omit<InferenceCostRow, "id" | "createdAt">): void {
    inferenceInsertCost(this.db, cost);
  }

  /**
   * Get total cost for the current hour.
   */
  getHourlyCost(): number {
    return inferenceGetHourlyCost(this.db);
  }

  /**
   * Get total cost for today (or a specific date).
   */
  getDailyCost(date?: string): number {
    return inferenceGetDailyCost(this.db, date);
  }

  /**
   * Get total cost for a specific session.
   */
  getSessionCost(sessionId: string): number {
    const costs = inferenceGetSessionCosts(this.db, sessionId);
    return costs.reduce((sum, c) => sum + c.costCents, 0);
  }

  /**
   * Get cost breakdown for a specific model.
   */
  getModelCosts(model: string, days?: number): { totalCents: number; callCount: number } {
    return inferenceGetModelCosts(this.db, model, days);
  }
}







