/**
 * Server Environment Utilities (Node-only)
 *
 * Full environment management with .env file support.
 * For Edge Runtime, use getEdgeEnv functions.
 * DO NOT import EnvManager from client components.
 */

// Edge-compatible functions (no fs dependency)
export {
  getEdgeBoolean,
  getEdgeEnv,
  getEdgeNumber,
  getEdgeString,
  getSkipAuth,
  hasEdgeEnv,
  isEdgeDev,
  isEdgeProd,
} from "./env.edge";
// Full EnvManager (requires fs)
export { Env, EnvManager, type EnvManagerOptions } from "./env.utils";
