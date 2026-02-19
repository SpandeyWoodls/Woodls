/**
 * Re-exports the gateway auth rate limiter so consumers can import from
 * the auth module directly.
 */

export {
  createAuthRateLimiter,
  AUTH_RATE_LIMIT_SCOPE_DEFAULT,
  AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
  AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN,
  type RateLimitConfig,
  type RateLimitEntry,
  type RateLimitCheckResult,
  type AuthRateLimiter,
} from "../auth-rate-limit.js";
