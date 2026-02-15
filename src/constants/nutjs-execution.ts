export const NUTJS_EXECUTION_OUTCOME = {
  DISABLED: "disabled",
  NOT_ALLOWLISTED: "not_allowlisted",
  CAPABILITY_NOOP: "capability_noop",
  EXECUTED: "executed",
} as const;

export type NutJsExecutionOutcome =
  (typeof NUTJS_EXECUTION_OUTCOME)[keyof typeof NUTJS_EXECUTION_OUTCOME];

export const NUTJS_ALLOWLIST_SEPARATOR = ",";
export const NUTJS_ALLOWLIST_WILDCARD = "*";
