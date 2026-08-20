/**
 * Metrics Collector
 *
 * In-process metrics collection with counters, gauges, and histograms.
 * Uses Map with JSON-serialized labels as composite keys.
 * Never throws — silently drops on error.
 */

import type { MetricEntry, MetricSnapshot, MetricType } from "../types.js";

function labelKey(name: string, labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) return name;
  const sorted = Object.keys(labels).sort().map((k) => `${k}=${labels[k]}`).join(",");
  return `${name}{${sorted}}`;
}

// Maximum number of values to retain per histogram key
const HISTOGRAM_MAX_VALUES = 1000;

export class MetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histogramValues = new Map<string, number[]>();
  private labelStore = new Map<string, Record<string, string>>();
  private nameStore = new Map<string, string>();

  increment(name: string, labels?: Record<string, string>, delta: number = 1): void {
    try {
      const key = labelKey(name, labels);
      this.counters.set(key, (this.counters.get(key) ?? 0) + delta);
      this.nameStore.set(key, name);
      this.labelStore.set(key, labels ?? {});
    } catch { /* never throw */ }
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    try {
      const key = labelKey(name, labels);
      this.gauges.set(key, value);
      this.nameStore.set(key, name);
      this.labelStore.set(key, labels ?? {});
    } catch { /* never throw */ }
  }

  histogram(name: string, value: number, labels?: Record<string, string>): void {
    try {
      const key = labelKey(name, labels);
      const existing = this.histogramValues.get(key) ?? [];
      existing.push(value);
      // Prevent unbounded memory growth by keeping only the most recent values
      if (existing.length > HISTOGRAM_MAX_VALUES) {
        existing.splice(0, existing.length - HISTOGRAM_MAX_VALUES);
      }
      this.histogramValues.set(key, existing);
      this.nameStore.set(key, name);
      this.labelStore.set(key, labels ?? {});
    } catch { /* never throw */ }
  }

  getCounter(name: string, labels?: Record<string, string>): number {
    try {
      return this.counters.get(labelKey(name, labels)) ?? 0;
    } catch { return 0; }
  }

  getGauge(name: string, labels?: Record<string, string>): number {
    try {
      return this.gauges.get(labelKey(name, labels)) ?? 0;
    } catch { return 0; }
  }

  getHistogram(name: string, labels?: Record<string, string>): number[] {
    try {
      return this.histogramValues.get(labelKey(name, labels)) ?? [];
    } catch { return []; }
  }

  getAll(): MetricEntry[] {
    const entries: MetricEntry[] = [];
    const now = new Date().toISOString();

    try {
      for (const [key, value] of this.counters) {
        entries.push({
          name: this.nameStore.get(key) ?? key,
          value,
          type: "counter" as MetricType,
          labels: this.labelStore.get(key) ?? {},
          timestamp: now,
        });
      }

      for (const [key, value] of this.gauges) {
        entries.push({
          name: this.nameStore.get(key) ?? key,
          value,
          type: "gauge" as MetricType,
          labels: this.labelStore.get(key) ?? {},
          timestamp: now,
        });
      }

      for (const [key, values] of this.histogramValues) {
        const sum = values.reduce((a, b) => a + b, 0);
        entries.push({
          name: this.nameStore.get(key) ?? key,
          value: sum / (values.length || 1),
          type: "histogram" as MetricType,
          labels: this.labelStore.get(key) ?? {},
          timestamp: now,
        });
      }
    } catch { /* never throw */ }

    return entries;
  }

  getSnapshot(): MetricSnapshot {
    const counters = new Map<string, number>();
    const gauges = new Map<string, number>();
    const histograms = new Map<string, number[]>();

    try {
      for (const [key, value] of this.counters) {
        const name = this.nameStore.get(key) ?? key;
        counters.set(name, (counters.get(name) ?? 0) + value);
      }

      for (const [key, value] of this.gauges) {
        const name = this.nameStore.get(key) ?? key;
        gauges.set(name, value);
      }

      for (const [key, values] of this.histogramValues) {
        const name = this.nameStore.get(key) ?? key;
        const existing = histograms.get(name) ?? [];
        histograms.set(name, existing.concat(values));
      }
    } catch { /* never throw */ }

    return { counters, gauges, histograms };
  }

  reset(): void {
    try {
      this.counters.clear();
      this.gauges.clear();
      this.histogramValues.clear();
      this.labelStore.clear();
      this.nameStore.clear();
    } catch { /* never throw */ }
  }
}

let singletonMetrics: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!singletonMetrics) {
    singletonMetrics = new MetricsCollector();
  }
  return singletonMetrics;
}







