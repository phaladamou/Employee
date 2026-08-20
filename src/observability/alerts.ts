/**
 * Alert Engine
 *
 * Evaluates alert rules against metric snapshots.
 * Tracks cooldowns per rule to avoid alert storms.
 * Never throws — evaluates all rules and collects errors silently.
 */

import type { AlertRule, AlertEvent, AlertSeverity, MetricSnapshot } from "../types.js";

export function createDefaultAlertRules(): AlertRule[] {
  return [
    {
      name: "balance_below_reserve",
      severity: "critical",
      message: "Balance is below minimum reserve (1000 cents)",
      cooldownMs: 5 * 60 * 1000, // 5 min
      condition: (metrics: MetricSnapshot) => {
        const balance = metrics.gauges.get("balance_cents") ?? Infinity;
        return balance < 1000;
      },
    },
    {
      name: "heartbeat_high_failure_rate",
      severity: "warning",
      message: "Heartbeat task failure rate exceeds 20%",
      cooldownMs: 15 * 60 * 1000, // 15 min
      condition: (metrics: MetricSnapshot) => {
        const failures = metrics.counters.get("heartbeat_task_failures_total") ?? 0;
        const successes = metrics.counters.get("heartbeat_task_successes_total") ?? 0;
        const total = failures + successes;
        if (total === 0) return false;
        return failures / total > 0.2;
      },
    },
    {
      name: "policy_high_deny_rate",
      severity: "warning",
      message: "Policy deny rate exceeds 50%",
      cooldownMs: 15 * 60 * 1000, // 15 min
      condition: (metrics: MetricSnapshot) => {
        const denies = metrics.counters.get("policy_denies_total") ?? 0;
        const total = metrics.counters.get("policy_decisions_total") ?? 0;
        if (total < 10) return false; // Need minimum sample size
        return denies / total > 0.5;
      },
    },
    {
      name: "context_near_capacity",
      severity: "warning",
      message: "Context token usage above 90% of budget",
      cooldownMs: 10 * 60 * 1000, // 10 min
      condition: (metrics: MetricSnapshot) => {
        const tokens = metrics.gauges.get("context_tokens_total") ?? 0;
        // 100k default budget
        return tokens > 90_000;
      },
    },
    {
      name: "inference_budget_warning",
      severity: "warning",
      message: "Daily inference cost exceeding 80% of cap",
      cooldownMs: 30 * 60 * 1000, // 30 min
      condition: (metrics: MetricSnapshot) => {
        const cost = metrics.counters.get("inference_cost_cents") ?? 0;
        // 500 cents ($5) daily default cap
        return cost > 400;
      },
    },
    {
      name: "child_unhealthy_extended",
      severity: "warning",
      message: "Child has been unhealthy for extended period",
      cooldownMs: 30 * 60 * 1000, // 30 min
      condition: (metrics: MetricSnapshot) => {
        const unhealthy = metrics.gauges.get("unhealthy_child_count") ?? 0;
        return unhealthy > 0;
      },
    },
    {
      name: "zero_turns_last_hour",
      severity: "critical",
      message: "No successful turns in the last hour",
      cooldownMs: 60 * 60 * 1000, // 60 min
      condition: (metrics: MetricSnapshot) => {
        const turnsLastHour = metrics.gauges.get("turns_last_hour") ?? -1;
        // Use windowed gauge if available; fall back to cumulative counter only
        // when the gauge hasn't been set yet (-1 sentinel).
        if (turnsLastHour >= 0) return turnsLastHour === 0;
        const turnsTotal = metrics.counters.get("turns_total") ?? -1;
        // If turns_total was never set, assume we just started — don't alert
        if (turnsTotal < 0) return false;
        return turnsTotal === 0;
      },
    },
  ];
}

export class AlertEngine {
  private rules: AlertRule[];
  private lastFired = new Map<string, number>();
  private activeAlerts: AlertEvent[] = [];

  constructor(rules?: AlertRule[]) {
    this.rules = rules ?? createDefaultAlertRules();
  }

  addRule(rule: AlertRule): void {
    try {
      this.rules.push(rule);
    } catch { /* never throw */ }
  }

  evaluate(metrics: MetricsCollector | MetricSnapshot): AlertEvent[] {
    const snapshot: MetricSnapshot = "getSnapshot" in metrics
      ? (metrics as any).getSnapshot()
      : metrics as MetricSnapshot;

    const now = Date.now();
    const fired: AlertEvent[] = [];

    for (const rule of this.rules) {
      try {
        const lastTime = this.lastFired.get(rule.name) ?? 0;
        if (now - lastTime < rule.cooldownMs) continue;

        if (rule.condition(snapshot)) {
          const event: AlertEvent = {
            rule: rule.name,
            severity: rule.severity,
            message: rule.message,
            firedAt: new Date().toISOString(),
            metricValues: this.extractMetricValues(snapshot),
          };
          fired.push(event);
          this.lastFired.set(rule.name, now);

          // Update active alerts (replace existing for same rule)
          this.activeAlerts = this.activeAlerts.filter((a) => a.rule !== rule.name);
          this.activeAlerts.push(event);
        }
      } catch { /* never throw — skip this rule */ }
    }

    return fired;
  }

  getActiveAlerts(): AlertEvent[] {
    return [...this.activeAlerts];
  }

  clearAlert(ruleName: string): void {
    try {
      this.activeAlerts = this.activeAlerts.filter((a) => a.rule !== ruleName);
      this.lastFired.delete(ruleName);
    } catch { /* never throw */ }
  }

  private extractMetricValues(snapshot: MetricSnapshot): Record<string, number> {
    const values: Record<string, number> = {};
    try {
      for (const [key, value] of snapshot.gauges) {
        values[key] = value;
      }
      for (const [key, value] of snapshot.counters) {
        values[key] = value;
      }
    } catch { /* never throw */ }
    return values;
  }
}

// Type-import for evaluate() overload compatibility
import type { MetricsCollector } from "./metrics.js";







