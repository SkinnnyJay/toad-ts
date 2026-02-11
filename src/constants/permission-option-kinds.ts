/**
 * ACP permission option kinds (allow_once, allow_always).
 */
export const PERMISSION_OPTION_KIND = {
  ALLOW_ONCE: "allow_once",
  ALLOW_ALWAYS: "allow_always",
} as const;

export type PermissionOptionKind =
  (typeof PERMISSION_OPTION_KIND)[keyof typeof PERMISSION_OPTION_KIND];

export const { ALLOW_ONCE, ALLOW_ALWAYS } = PERMISSION_OPTION_KIND;
