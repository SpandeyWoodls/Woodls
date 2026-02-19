/**
 * Circuit breaker for AI provider error loops.
 *
 * Prevents cascading failures across providers by tracking per-provider
 * error rates and stopping requests to providers that are consistently failing.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through.
 * - OPEN: Provider is failing, requests are immediately rejected.
 * - HALF_OPEN: Testing if provider has recovered; one request is allowed through.
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type CircuitBreakerOptions = {
  /** Max consecutive failures before opening the circuit. Default: 3. */
  maxFailures?: number;
  /** Time in ms before an OPEN circuit transitions to HALF_OPEN. Default: 30000. */
  resetTimeoutMs?: number;
};

const DEFAULT_MAX_FAILURES = 3;
const DEFAULT_RESET_TIMEOUT_MS = 30_000;

export class CircuitBreaker {
  private _state: CircuitState = "CLOSED";
  private _failureCount = 0;
  private _lastFailureTime = 0;
  private readonly _maxFailures: number;
  private readonly _resetTimeoutMs: number;

  constructor(
    readonly provider: string,
    options?: CircuitBreakerOptions,
  ) {
    this._maxFailures = options?.maxFailures ?? DEFAULT_MAX_FAILURES;
    this._resetTimeoutMs = options?.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;
  }

  get state(): CircuitState {
    if (this._state === "OPEN" && Date.now() - this._lastFailureTime >= this._resetTimeoutMs) {
      this._state = "HALF_OPEN";
    }
    return this._state;
  }

  get failureCount(): number {
    return this._failureCount;
  }

  /** Returns true if the circuit allows a request to pass through. */
  canAttempt(): boolean {
    const current = this.state;
    return current === "CLOSED" || current === "HALF_OPEN";
  }

  /** Record a successful request. Resets the circuit to CLOSED. */
  recordSuccess(): void {
    this._failureCount = 0;
    this._state = "CLOSED";
  }

  /** Record a failed request. May transition to OPEN. */
  recordFailure(): void {
    this._failureCount += 1;
    this._lastFailureTime = Date.now();
    if (this._failureCount >= this._maxFailures) {
      this._state = "OPEN";
    }
  }

  /** Force-reset the breaker to CLOSED state. */
  reset(): void {
    this._state = "CLOSED";
    this._failureCount = 0;
    this._lastFailureTime = 0;
  }
}

export type CircuitBreakerRunOptions = {
  /** Max retry count per individual provider. Default: 3. */
  maxRetriesPerProvider?: number;
  /** Max total attempts across all providers. Default: 10. */
  maxTotalAttempts?: number;
  /** Starting backoff delay in ms. Default: 1000. */
  backoffStartMs?: number;
  /** Maximum backoff delay in ms. Default: 30000. */
  backoffMaxMs?: number;
  /** Backoff multiplier. Default: 2. */
  backoffFactor?: number;
  /** Circuit breaker options applied to each per-provider breaker. */
  circuitOptions?: CircuitBreakerOptions;
};

const DEFAULT_MAX_RETRIES_PER_PROVIDER = 3;
const DEFAULT_MAX_TOTAL_ATTEMPTS = 10;
const DEFAULT_BACKOFF_START_MS = 1_000;
const DEFAULT_BACKOFF_MAX_MS = 30_000;
const DEFAULT_BACKOFF_FACTOR = 2;

/** Shared per-provider circuit breaker registry (module-scoped singleton). */
const providerBreakers = new Map<string, CircuitBreaker>();

export function getOrCreateBreaker(
  provider: string,
  options?: CircuitBreakerOptions,
): CircuitBreaker {
  let breaker = providerBreakers.get(provider);
  if (!breaker) {
    breaker = new CircuitBreaker(provider, options);
    providerBreakers.set(provider, breaker);
  }
  return breaker;
}

/** Reset all circuit breakers. Primarily for testing. */
export function resetAllBreakers(): void {
  providerBreakers.clear();
}

/** @internal - exposed for testing */
export const _circuitBreakerInternals = {
  providerBreakers,
} as const;

export class AllProvidersExhaustedError extends Error {
  readonly attempts: Array<{ provider: string; model: string; error: string }>;
  constructor(attempts: Array<{ provider: string; model: string; error: string }>) {
    const summary = attempts.map((a) => `${a.provider}/${a.model}: ${a.error}`).join(" | ");
    super(`All providers exhausted after ${attempts.length} attempt(s): ${summary}`);
    this.name = "AllProvidersExhaustedError";
    this.attempts = attempts;
  }
}

function computeBackoff(attempt: number, startMs: number, maxMs: number, factor: number): number {
  // attempt is 0-indexed: first retry = attempt 0 => startMs
  const delay = startMs * Math.pow(factor, attempt);
  // Add jitter: +/- 20%
  const jitter = delay * 0.2 * (2 * Math.random() - 1);
  return Math.min(maxMs, Math.max(0, delay + jitter));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type CircuitBreakerAttempt = {
  provider: string;
  model: string;
  error: string;
  retryIndex: number;
};

/**
 * Execute `run` against a list of provider/model candidates, using per-provider
 * circuit breakers, retry limits, and exponential backoff.
 *
 * The caller (e.g., `runWithModelFallback`) provides the candidate list and the
 * run function. This wrapper adds:
 * - Per-provider circuit breakers (skip OPEN providers).
 * - Per-provider retry counting (max `maxRetriesPerProvider`).
 * - Global attempt counting (max `maxTotalAttempts`).
 * - Exponential backoff with jitter between retries.
 * - `AllProvidersExhaustedError` when nothing is left.
 */
export async function runWithCircuitBreaker<T>(params: {
  candidates: Array<{ provider: string; model: string }>;
  run: (provider: string, model: string) => Promise<T>;
  /** Called on each failure (for logging, cooldowns, etc.). */
  onError?: (attempt: {
    provider: string;
    model: string;
    error: unknown;
    attempt: number;
    total: number;
  }) => void | Promise<void>;
  /** Called when a provider's circuit opens. */
  onCircuitOpen?: (provider: string) => void;
  /** Predicate: return true to immediately rethrow this error without retry. */
  shouldRethrow?: (err: unknown) => boolean;
  options?: CircuitBreakerRunOptions;
}): Promise<{ result: T; provider: string; model: string; attempts: CircuitBreakerAttempt[] }> {
  const maxRetries = params.options?.maxRetriesPerProvider ?? DEFAULT_MAX_RETRIES_PER_PROVIDER;
  const maxTotal = params.options?.maxTotalAttempts ?? DEFAULT_MAX_TOTAL_ATTEMPTS;
  const backoffStart = params.options?.backoffStartMs ?? DEFAULT_BACKOFF_START_MS;
  const backoffMax = params.options?.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS;
  const backoffFactor = params.options?.backoffFactor ?? DEFAULT_BACKOFF_FACTOR;
  const circuitOptions = params.options?.circuitOptions;

  const attempts: CircuitBreakerAttempt[] = [];
  const providerRetryCounts = new Map<string, number>();
  let totalAttempts = 0;

  // Keep cycling through candidates until we exhaust attempts.
  // A single pass may skip open-circuit providers, so we loop until either
  // success, hard limit, or all providers are truly exhausted.
  let madeProgress = true;
  while (madeProgress && totalAttempts < maxTotal) {
    madeProgress = false;

    for (const candidate of params.candidates) {
      if (totalAttempts >= maxTotal) {
        break;
      }

      const breaker = getOrCreateBreaker(candidate.provider, circuitOptions);
      if (!breaker.canAttempt()) {
        continue;
      }

      const providerRetries = providerRetryCounts.get(candidate.provider) ?? 0;
      if (providerRetries >= maxRetries) {
        continue;
      }

      madeProgress = true;
      totalAttempts += 1;

      // Backoff before retry (skip on first attempt for this provider)
      if (providerRetries > 0) {
        const delay = computeBackoff(providerRetries - 1, backoffStart, backoffMax, backoffFactor);
        await sleep(delay);
      }

      try {
        const result = await params.run(candidate.provider, candidate.model);
        breaker.recordSuccess();
        return { result, provider: candidate.provider, model: candidate.model, attempts };
      } catch (err) {
        if (params.shouldRethrow?.(err)) {
          throw err;
        }

        breaker.recordFailure();
        providerRetryCounts.set(candidate.provider, providerRetries + 1);

        const errorMsg = err instanceof Error ? err.message : String(err);
        attempts.push({
          provider: candidate.provider,
          model: candidate.model,
          error: errorMsg,
          retryIndex: providerRetries,
        });

        if (breaker.state === "OPEN") {
          params.onCircuitOpen?.(candidate.provider);
        }

        await params.onError?.({
          provider: candidate.provider,
          model: candidate.model,
          error: err,
          attempt: totalAttempts,
          total: maxTotal,
        });
      }
    }
  }

  throw new AllProvidersExhaustedError(attempts);
}
