/**
 * Edge Runtime-compatible environment variable utilities.
 *
 * This module provides a way to access environment variables in Edge Runtime
 * (middleware, Edge API routes) without importing server-only modules like 'fs' or 'winston'.
 *
 * Edge Runtime limitations:
 * - No file system access (can't read .env files)
 * - No Node.js APIs like process.cwd()
 * - Only process.env is available (set at build/deploy time)
 *
 * For full environment variable management with .env file support, use env.utils.ts
 * in Node.js runtime contexts (API routes, server components, etc.).
 */

/**
 * Get an environment variable value or return a default.
 * Works in Edge Runtime by reading directly from process.env.
 *
 * @param key - Environment variable key
 * @param defaultValue - Default value to return if variable is not set
 * @returns The environment variable value or default
 */
export function getEdgeEnv<T extends string | number | boolean>(key: string, defaultValue: T): T {
  const value: string | undefined = process.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof defaultValue === "number") {
    const parsedValue: number = Number(value);
    return (Number.isNaN(parsedValue) ? defaultValue : parsedValue) as T;
  }

  if (typeof defaultValue === "boolean") {
    const normalizedValue: string = value.toLowerCase();
    return (normalizedValue === "true" || normalizedValue === "1") as T;
  }

  return value as T;
}

/**
 * Get a string environment variable with default (Edge Runtime).
 */
export function getEdgeString(key: string, defaultValue = ""): string {
  return getEdgeEnv(key, defaultValue);
}

/**
 * Get a number environment variable with default (Edge Runtime).
 */
export function getEdgeNumber(key: string, defaultValue = 0): number {
  return getEdgeEnv(key, defaultValue);
}

/**
 * Get a boolean environment variable with default (Edge Runtime).
 */
export function getEdgeBoolean(key: string, defaultValue = false): boolean {
  return getEdgeEnv(key, defaultValue);
}

/**
 * Get SKIP_AUTH flag for Edge Runtime (middleware).
 * Uses SKIP_AUTH environment variable directly from process.env.
 */
export function getSkipAuth(): boolean {
  return getEdgeEnv("SKIP_AUTH", false);
}

/**
 * Check if an environment variable is set (Edge Runtime).
 */
export function hasEdgeEnv(key: string): boolean {
  return process.env[key] !== undefined;
}

/**
 * Check if running in production (Edge Runtime).
 */
export function isEdgeProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development (Edge Runtime).
 */
export function isEdgeDev(): boolean {
  return process.env.NODE_ENV === "development";
}
