/**
 * Token and password validation logic for gateway authentication.
 *
 * Re-exports {@link safeEqualSecret} from the security module so that
 * consumers of the auth package do not need to reach into security/ directly.
 */

export { safeEqualSecret } from "../../security/secret-equal.js";
