export const NUTJS_PERMISSION_STATUS = {
  GRANTED: "granted",
  MISSING: "missing",
  UNKNOWN: "unknown",
  NOT_APPLICABLE: "not_applicable",
} as const;

export type NutJsPermissionStatus =
  (typeof NUTJS_PERMISSION_STATUS)[keyof typeof NUTJS_PERMISSION_STATUS];

export const NUTJS_WINDOWS_INTEGRITY_LEVEL = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  SYSTEM: "system",
  UNKNOWN: "unknown",
} as const;

export type NutJsWindowsIntegrityLevel =
  (typeof NUTJS_WINDOWS_INTEGRITY_LEVEL)[keyof typeof NUTJS_WINDOWS_INTEGRITY_LEVEL];
