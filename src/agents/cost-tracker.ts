import { createSubsystemLogger } from "../logging/subsystem.js";
import type { NormalizedUsage } from "./usage.js";

const log = createSubsystemLogger("agent/cost-tracker");

/**
 * Categories of token usage for cost attribution.
 */
export type UsageType = "compaction" | "inference" | "tool_result" | "other";

/**
 * Per-provider pricing in USD per 1M tokens.
 */
export type ProviderPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
};

/**
 * Default pricing rates (USD per 1M tokens) for major providers.
 * These are approximate list prices and can be overridden via configuration.
 */
export const DEFAULT_PROVIDER_PRICING: Record<string, ProviderPricing> = {
  anthropic: {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheReadPerMillion: 1.5,
    cacheWritePerMillion: 18.75,
  },
  openai: {
    inputPerMillion: 10,
    outputPerMillion: 30,
  },
  google: {
    inputPerMillion: 1.25,
    outputPerMillion: 5,
  },
  bedrock: {
    inputPerMillion: 15,
    outputPerMillion: 75,
  },
  together: {
    inputPerMillion: 5,
    outputPerMillion: 15,
  },
  ollama: {
    inputPerMillion: 0,
    outputPerMillion: 0,
  },
};

type UsageEntry = {
  provider: string;
  type: UsageType;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type CostSummaryByType = {
  type: UsageType;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostUsd: number;
};

export type CostSummaryByProvider = {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCostUsd: number;
};

export type CostSummary = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalEstimatedCostUsd: number;
  byType: CostSummaryByType[];
  byProvider: CostSummaryByProvider[];
};

/**
 * Tracks per-run AI token usage and estimates costs by provider and usage type.
 */
export class CostTracker {
  private entries: UsageEntry[] = [];
  private customPricing: Record<string, ProviderPricing>;

  constructor(customPricing?: Record<string, ProviderPricing>) {
    this.customPricing = customPricing ?? {};
  }

  /**
   * Record token usage for a specific provider and operation type.
   */
  trackUsage(
    provider: string,
    type: UsageType,
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens = 0,
    cacheWriteTokens = 0,
  ): void {
    this.entries.push({
      provider: normalizeProviderKey(provider),
      type,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
    });
  }

  /**
   * Convenience method to track usage from a NormalizedUsage object.
   */
  trackNormalizedUsage(
    provider: string,
    type: UsageType,
    usage: NormalizedUsage | undefined,
  ): void {
    if (!usage) {
      return;
    }
    this.trackUsage(
      provider,
      type,
      usage.input ?? 0,
      usage.output ?? 0,
      usage.cacheRead ?? 0,
      usage.cacheWrite ?? 0,
    );
  }

  /**
   * Get a summary of all tracked usage, broken down by type and provider.
   */
  getSummary(): CostSummary {
    const byTypeMap = new Map<UsageType, Omit<CostSummaryByType, "estimatedCostUsd">>();
    const byProviderMap = new Map<
      string,
      Omit<CostSummaryByProvider, "estimatedCostUsd"> & { costAcc: number }
    >();

    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;
    let totalCost = 0;

    for (const entry of this.entries) {
      const cost = this.calculateEntryCost(entry);
      totalInput += entry.inputTokens;
      totalOutput += entry.outputTokens;
      totalCacheRead += entry.cacheReadTokens;
      totalCacheWrite += entry.cacheWriteTokens;
      totalCost += cost;

      // By type
      const existing = byTypeMap.get(entry.type) ?? {
        type: entry.type,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      };
      existing.inputTokens += entry.inputTokens;
      existing.outputTokens += entry.outputTokens;
      existing.cacheReadTokens += entry.cacheReadTokens;
      existing.cacheWriteTokens += entry.cacheWriteTokens;
      byTypeMap.set(entry.type, existing);

      // By provider
      const provExisting = byProviderMap.get(entry.provider) ?? {
        provider: entry.provider,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        costAcc: 0,
      };
      provExisting.inputTokens += entry.inputTokens;
      provExisting.outputTokens += entry.outputTokens;
      provExisting.cacheReadTokens += entry.cacheReadTokens;
      provExisting.cacheWriteTokens += entry.cacheWriteTokens;
      provExisting.costAcc += cost;
      byProviderMap.set(entry.provider, provExisting);
    }

    const byType: CostSummaryByType[] = Array.from(byTypeMap.values()).map((v) => {
      const entriesForType = this.entries.filter((e) => e.type === v.type);
      let typeCost = 0;
      for (const e of entriesForType) {
        typeCost += this.calculateEntryCost(e);
      }
      return { ...v, estimatedCostUsd: typeCost };
    });

    const byProvider: CostSummaryByProvider[] = Array.from(byProviderMap.values()).map((v) => {
      const { costAcc, ...rest } = v;
      return { ...rest, estimatedCostUsd: costAcc };
    });

    return {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalCacheReadTokens: totalCacheRead,
      totalCacheWriteTokens: totalCacheWrite,
      totalEstimatedCostUsd: totalCost,
      byType,
      byProvider,
    };
  }

  /**
   * Reset all tracked usage data.
   */
  reset(): void {
    this.entries = [];
  }

  /**
   * Log a summary of the run's token usage and cost.
   */
  logSummary(): void {
    const summary = this.getSummary();
    if (summary.totalInputTokens === 0 && summary.totalOutputTokens === 0) {
      return;
    }

    const lines: string[] = [
      `Cost summary: ${formatTokenCount(summary.totalInputTokens)} input, ${formatTokenCount(summary.totalOutputTokens)} output tokens`,
    ];

    if (summary.totalCacheReadTokens > 0 || summary.totalCacheWriteTokens > 0) {
      lines[0] += ` (cache: ${formatTokenCount(summary.totalCacheReadTokens)} read, ${formatTokenCount(summary.totalCacheWriteTokens)} write)`;
    }

    lines[0] += ` ~$${summary.totalEstimatedCostUsd.toFixed(4)}`;

    if (summary.byProvider.length > 1) {
      for (const p of summary.byProvider) {
        lines.push(
          `  ${p.provider}: ${formatTokenCount(p.inputTokens)} in / ${formatTokenCount(p.outputTokens)} out ~$${p.estimatedCostUsd.toFixed(4)}`,
        );
      }
    }

    if (summary.byType.length > 1) {
      for (const t of summary.byType) {
        lines.push(
          `  ${t.type}: ${formatTokenCount(t.inputTokens)} in / ${formatTokenCount(t.outputTokens)} out ~$${t.estimatedCostUsd.toFixed(4)}`,
        );
      }
    }

    log.info(lines.join("\n"));
  }

  private calculateEntryCost(entry: UsageEntry): number {
    const pricing = this.getPricing(entry.provider);
    if (!pricing) {
      return 0;
    }
    const inputCost = (entry.inputTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (entry.outputTokens / 1_000_000) * pricing.outputPerMillion;
    const cacheReadCost =
      (entry.cacheReadTokens / 1_000_000) *
      (pricing.cacheReadPerMillion ?? pricing.inputPerMillion);
    const cacheWriteCost =
      (entry.cacheWriteTokens / 1_000_000) *
      (pricing.cacheWritePerMillion ?? pricing.inputPerMillion);
    return inputCost + outputCost + cacheReadCost + cacheWriteCost;
  }

  private getPricing(provider: string): ProviderPricing | undefined {
    const key = normalizeProviderKey(provider);
    return this.customPricing[key] ?? DEFAULT_PROVIDER_PRICING[key];
  }
}

function normalizeProviderKey(provider: string): string {
  return provider.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return `${count}`;
}
