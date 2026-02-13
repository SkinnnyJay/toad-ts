/**
 * ACP permission option kinds.
 */
export const PERMISSION_OPTION_KIND = {
  ALLOW_ONCE: "allow_once",
  ALLOW_ALWAYS: "allow_always",
  REJECT_ONCE: "reject_once",
  REJECT_ALWAYS: "reject_always",
} as const;

export type PermissionOptionKind =
  (typeof PERMISSION_OPTION_KIND)[keyof typeof PERMISSION_OPTION_KIND];

export const { ALLOW_ONCE, ALLOW_ALWAYS, REJECT_ONCE, REJECT_ALWAYS } = PERMISSION_OPTION_KIND;
