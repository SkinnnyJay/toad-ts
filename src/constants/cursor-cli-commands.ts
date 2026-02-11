import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";

export const CURSOR_CLI_COMMAND = {
  VERSION: "--version",
  STATUS: AGENT_MANAGEMENT_COMMAND.STATUS,
  MODELS: AGENT_MANAGEMENT_COMMAND.MODELS,
  LIST: AGENT_MANAGEMENT_COMMAND.LIST,
  CREATE_CHAT: "create-chat",
} as const;
