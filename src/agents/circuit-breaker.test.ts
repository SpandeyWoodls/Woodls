import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AllProvidersExhaustedError,
  CircuitBreaker,
  resetAllBreakers,
  runWithCircuitBreaker,
} from "./circuit-breaker.js";

afterEach(() => {
  resetAllBreakers();
  vi.restoreAllMocks();
});

describe("CircuitBreaker class", () => {
  it("starts in CLOSED state", () => {
    const cb = new CircuitBreaker("test-provider");
    expect(cb.state).toBe("CLOSED");
    expect(cb.canAttempt()).toBe(true);
  });

  it("transitions to OPEN after maxFailures", () => {
    const cb = new CircuitBreaker("test-provider", { maxFailures: 2 });
    cb.recordFailure();
    expect(cb.state).toBe("CLOSED");
    cb.recordFailure();
    expect(cb.state).toBe("OPEN");
    expect(cb.canAttempt()).toBe(false);
  });

  it("resets to CLOSED on success", () => {
    const cb = new CircuitBreaker("test-provider", { maxFailures: 2 });
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(0);
  });

  it("transitions from OPEN to HALF_OPEN after resetTimeout", () => {
    const cb = new CircuitBreaker("test-provider", { maxFailures: 1, resetTimeoutMs: 100 });
    cb.recordFailure();
    expect(cb.state).toBe("OPEN");

    // Fast-forward time
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 200);
    expect(cb.state).toBe("HALF_OPEN");
    expect(cb.canAttempt()).toBe(true);
  });

  it("reset() forces CLOSED state", () => {
    const cb = new CircuitBreaker("test-provider", { maxFailures: 1 });
    cb.recordFailure();
    expect(cb.state).toBe("OPEN");
    cb.reset();
    expect(cb.state).toBe("CLOSED");
    expect(cb.failureCount).toBe(0);
  });
});

describe("runWithCircuitBreaker", () => {
  it("returns result on first success", async () => {
    const result = await runWithCircuitBreaker({
      candidates: [{ provider: "openai", model: "gpt-4" }],
      run: async () => "ok",
    });
    expect(result.result).toBe("ok");
    expect(result.provider).toBe("openai");
    expect(result.attempts).toHaveLength(0);
  });

  it("retries on failure and succeeds", async () => {
    let callCount = 0;
    const result = await runWithCircuitBreaker({
      candidates: [{ provider: "openai", model: "gpt-4" }],
      run: async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error("transient");
        }
        return "recovered";
      },
      options: { backoffStartMs: 1, backoffMaxMs: 5 },
    });
    expect(result.result).toBe("recovered");
    expect(result.attempts).toHaveLength(2);
    expect(callCount).toBe(3);
  });

  it("falls back to next provider when first is exhausted", async () => {
    const result = await runWithCircuitBreaker({
      candidates: [
        { provider: "openai", model: "gpt-4" },
        { provider: "anthropic", model: "claude" },
      ],
      run: async (provider) => {
        if (provider === "openai") {
          throw new Error("openai down");
        }
        return "anthropic-ok";
      },
      options: { maxRetriesPerProvider: 1, backoffStartMs: 1 },
    });
    expect(result.result).toBe("anthropic-ok");
    expect(result.provider).toBe("anthropic");
  });

  it("throws AllProvidersExhaustedError when all fail", async () => {
    await expect(
      runWithCircuitBreaker({
        candidates: [
          { provider: "openai", model: "gpt-4" },
          { provider: "anthropic", model: "claude" },
        ],
        run: async () => {
          throw new Error("fail");
        },
        options: { maxRetriesPerProvider: 2, maxTotalAttempts: 4, backoffStartMs: 1 },
      }),
    ).rejects.toThrow(AllProvidersExhaustedError);
  });

  it("respects maxTotalAttempts limit", async () => {
    let callCount = 0;
    await expect(
      runWithCircuitBreaker({
        candidates: [{ provider: "openai", model: "gpt-4" }],
        run: async () => {
          callCount++;
          throw new Error("fail");
        },
        options: { maxRetriesPerProvider: 10, maxTotalAttempts: 3, backoffStartMs: 1 },
      }),
    ).rejects.toThrow(AllProvidersExhaustedError);
    expect(callCount).toBe(3);
  });

  it("immediately rethrows when shouldRethrow returns true", async () => {
    const abortErr = new Error("user abort");
    abortErr.name = "AbortError";

    await expect(
      runWithCircuitBreaker({
        candidates: [{ provider: "openai", model: "gpt-4" }],
        run: async () => {
          throw abortErr;
        },
        shouldRethrow: (err) => err instanceof Error && err.name === "AbortError",
      }),
    ).rejects.toThrow("user abort");
  });

  it("calls onCircuitOpen when a provider's circuit opens", async () => {
    const opened: string[] = [];
    await expect(
      runWithCircuitBreaker({
        candidates: [{ provider: "openai", model: "gpt-4" }],
        run: async () => {
          throw new Error("fail");
        },
        onCircuitOpen: (provider) => opened.push(provider),
        options: {
          maxRetriesPerProvider: 5,
          maxTotalAttempts: 5,
          backoffStartMs: 1,
          circuitOptions: { maxFailures: 3 },
        },
      }),
    ).rejects.toThrow();
    expect(opened).toContain("openai");
  });

  it("skips providers with open circuits", async () => {
    const called: string[] = [];
    // First run: break openai's circuit
    await expect(
      runWithCircuitBreaker({
        candidates: [{ provider: "openai", model: "gpt-4" }],
        run: async () => {
          called.push("openai");
          throw new Error("fail");
        },
        options: {
          maxRetriesPerProvider: 3,
          maxTotalAttempts: 3,
          backoffStartMs: 1,
          circuitOptions: { maxFailures: 3, resetTimeoutMs: 60_000 },
        },
      }),
    ).rejects.toThrow();

    // Second run: openai should be skipped, anthropic should succeed
    called.length = 0;
    const result = await runWithCircuitBreaker({
      candidates: [
        { provider: "openai", model: "gpt-4" },
        { provider: "anthropic", model: "claude" },
      ],
      run: async (provider) => {
        called.push(provider);
        if (provider === "openai") {
          throw new Error("still down");
        }
        return "ok";
      },
      options: { backoffStartMs: 1 },
    });
    expect(called).toEqual(["anthropic"]);
    expect(result.provider).toBe("anthropic");
  });
});
