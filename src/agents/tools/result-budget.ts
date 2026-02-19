/**
 * Pre-execution tool result budgeting.
 *
 * Provides per-tool-type size budgets and utilities to estimate whether a tool
 * call is likely to produce an oversized result, and to truncate results
 * cleanly (on line boundaries) when they exceed their budget.
 */

import { logWarn } from "../../logger.js";

// ---------------------------------------------------------------------------
// Default budgets (in bytes) per tool category
// ---------------------------------------------------------------------------

/** Budget for file-read tools (read, cat-style). */
const FILE_READ_BUDGET = 100 * 1024; // 100 KB

/** Budget for web fetch / URL retrieval tools. */
const WEB_FETCH_BUDGET = 50 * 1024; // 50 KB

/** Budget for search tools (web search, grep, glob). */
const SEARCH_BUDGET = 30 * 1024; // 30 KB

/** Budget for shell / bash execution tools. */
const BASH_BUDGET = 50 * 1024; // 50 KB

/** Fallback budget for any tool not explicitly categorized. */
const DEFAULT_BUDGET = 50 * 1024; // 50 KB

// ---------------------------------------------------------------------------
// Tool-name to category mapping
// ---------------------------------------------------------------------------

type ToolCategory = "file_read" | "web_fetch" | "search" | "bash" | "default";

const TOOL_CATEGORY_MAP: Record<string, ToolCategory> = {
  // File reads
  read: "file_read",
  Read: "file_read",
  file_read: "file_read",
  cat: "file_read",

  // Web fetching
  web_fetch: "web_fetch",
  WebFetch: "web_fetch",
  fetch: "web_fetch",

  // Search
  web_search: "web_fetch",
  WebSearch: "web_fetch",
  search: "search",
  grep: "search",
  Grep: "search",
  glob: "search",
  Glob: "search",

  // Bash / exec
  exec: "bash",
  bash: "bash",
  Bash: "bash",
  process: "bash",
};

const CATEGORY_BUDGETS: Record<ToolCategory, number> = {
  file_read: FILE_READ_BUDGET,
  web_fetch: WEB_FETCH_BUDGET,
  search: SEARCH_BUDGET,
  bash: BASH_BUDGET,
  default: DEFAULT_BUDGET,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve the tool category for a given tool name.
 */
function resolveCategory(toolName: string): ToolCategory {
  return TOOL_CATEGORY_MAP[toolName] ?? "default";
}

/**
 * Return the byte budget for a given tool name.
 */
export function getBudgetForTool(toolName: string): number {
  return CATEGORY_BUDGETS[resolveCategory(toolName)];
}

export type BudgetCheckResult = {
  /** The resolved budget in bytes for this tool. */
  budget: number;
  /** The tool category used to determine the budget. */
  category: ToolCategory;
  /**
   * For tools that accept a size-limit parameter (file reads, web fetches),
   * a suggested parameter value to pass into the tool so it self-limits.
   * `undefined` when the tool does not support pre-limiting.
   */
  suggestedLimit?: number;
};

/**
 * Pre-execution budget check.
 *
 * Returns budget metadata for the given tool invocation. For tools that
 * accept size-limiting parameters (e.g. `maxChars` on web_fetch, or
 * `limit` on file reads), it also computes a `suggestedLimit` that callers
 * can inject into the tool parameters before execution.
 *
 * @param toolName - The canonical tool name (e.g. "exec", "web_fetch").
 * @param params   - The raw parameters the model produced for this call.
 */
export function budgetCheck(toolName: string, params?: Record<string, unknown>): BudgetCheckResult {
  const category = resolveCategory(toolName);
  const budget = CATEGORY_BUDGETS[category];

  const result: BudgetCheckResult = { budget, category };

  // For web-fetch tools: suggest a maxChars limit if not already set.
  if (category === "web_fetch") {
    const existing =
      params && typeof params.maxChars === "number" && Number.isFinite(params.maxChars)
        ? params.maxChars
        : undefined;
    if (existing === undefined || existing > budget) {
      result.suggestedLimit = budget;
    }
  }

  // For file-read tools: suggest a byte/line limit.
  if (category === "file_read") {
    const existingLimit =
      params && typeof params.limit === "number" && Number.isFinite(params.limit)
        ? params.limit
        : undefined;
    // Only suggest when the caller did not set an explicit limit.
    if (existingLimit === undefined) {
      // Estimate ~80 chars per line, convert budget to line count.
      result.suggestedLimit = Math.floor(budget / 80);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Post-execution truncation
// ---------------------------------------------------------------------------

const TRUNCATION_NOTICE =
  "\n\n[tool result truncated — exceeded budget of {budget} bytes. " +
  "Use offset/limit parameters or request specific sections for large content.]";

/**
 * Truncate a tool result string to fit within the given budget.
 *
 * Truncation is performed on a line boundary to avoid cutting in the middle
 * of a line, which would produce confusing partial output.
 *
 * @param result - The raw tool result text.
 * @param budget - The maximum allowed size in bytes.
 * @returns The (possibly truncated) result string.
 */
export function truncateResult(result: string, budget: number): string {
  const size = Buffer.byteLength(result, "utf-8");
  if (size <= budget) {
    return result;
  }

  const notice = TRUNCATION_NOTICE.replace("{budget}", String(budget));
  const targetBytes = Math.max(0, budget - Buffer.byteLength(notice, "utf-8"));

  // Walk character-by-character is expensive for large strings; instead,
  // use a heuristic: average 1-2 bytes per char in typical ASCII/UTF-8 tool
  // output.  Slice conservatively then find a clean newline boundary.
  let estimatedCharCut = Math.min(result.length, targetBytes);
  // Refine: measure actual byte length and shrink if needed.
  while (
    estimatedCharCut > 0 &&
    Buffer.byteLength(result.slice(0, estimatedCharCut), "utf-8") > targetBytes
  ) {
    estimatedCharCut = Math.floor(estimatedCharCut * 0.9);
  }

  // Snap to a newline boundary (don't cut mid-line).
  let cutPoint = estimatedCharCut;
  const lastNewline = result.lastIndexOf("\n", estimatedCharCut);
  if (lastNewline > estimatedCharCut * 0.7) {
    cutPoint = lastNewline;
  }

  return result.slice(0, cutPoint) + notice;
}

/**
 * Log a warning when a tool result exceeds its budget.
 *
 * Call this after tool execution to emit a diagnostic log line.
 */
export function warnIfOverBudget(toolName: string, resultText: string): void {
  const budget = getBudgetForTool(toolName);
  const size = Buffer.byteLength(resultText, "utf-8");
  if (size > budget) {
    logWarn(
      `[result-budget] Tool "${toolName}" result exceeded budget: ` +
        `${size} bytes > ${budget} bytes (${Math.round((size / budget) * 100)}% of budget)`,
    );
  }
}
