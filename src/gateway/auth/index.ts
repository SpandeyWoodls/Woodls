/**
 * Gateway authentication module.
 *
 * Public API – re-exports from sub-modules so consumers can import
 * everything they need from `./auth/index.js`.
 */

// Middleware / core auth logic
export {
  authorizeGatewayConnect,
  assertGatewayAuthConfigured,
  resolveGatewayAuth,
  sanitizeAuthForLog,
  isLocalDirectRequest,
  type ResolvedGatewayAuth,
  type ResolvedGatewayAuthMode,
  type GatewayAuthResult,
} from "./middleware.js";

// Token / secret validation
export { safeEqualSecret } from "./token-validator.js";

// Rate limiting
export {
  createAuthRateLimiter,
  AUTH_RATE_LIMIT_SCOPE_DEFAULT,
  AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
  AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN,
  type RateLimitConfig,
  type RateLimitEntry,
  type RateLimitCheckResult,
  type AuthRateLimiter,
} from "./rate-limiter.js";
