/**
 * Re-export shim – all auth logic now lives in ./auth/ module.
 *
 * Existing imports from "./auth.js" continue to work without changes.
 */

export {
  authorizeGatewayConnect,
  assertGatewayAuthConfigured,
  resolveGatewayAuth,
  sanitizeAuthForLog,
  isLocalDirectRequest,
  type ResolvedGatewayAuth,
  type ResolvedGatewayAuthMode,
  type GatewayAuthResult,
} from "./auth/index.js";
