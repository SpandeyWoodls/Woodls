import { timingSafeEqual } from "node:crypto";

/**
 * Mask a secret for safe inclusion in log output.
 * Shows the first 4 characters followed by "****".
 * Returns "(none)" for empty/missing values.
 */
export function maskSecret(value: string | undefined | null): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "(none)";
  }
  if (value.length <= 4) {
    return "****";
  }
  return `${value.slice(0, 4)}****`;
}

export function safeEqualSecret(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}
