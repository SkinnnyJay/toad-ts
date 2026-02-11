export const AGENT_MANAGEMENT_ERROR_MESSAGE = {
  AUTH_STATUS_COMMAND_FAILED: "CLI auth status command failed.",
  MODELS_COMMAND_FAILED: "CLI models command failed.",
  SESSION_LIST_COMMAND_FAILED: "CLI session listing command failed.",
} as const;

export type AgentManagementErrorMessage =
  (typeof AGENT_MANAGEMENT_ERROR_MESSAGE)[keyof typeof AGENT_MANAGEMENT_ERROR_MESSAGE];

export const { AUTH_STATUS_COMMAND_FAILED, MODELS_COMMAND_FAILED, SESSION_LIST_COMMAND_FAILED } =
  AGENT_MANAGEMENT_ERROR_MESSAGE;
