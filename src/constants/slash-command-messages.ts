import type { SessionMode } from "@/types/domain";

export const SLASH_COMMAND_MESSAGE = {
  NO_ACTIVE_SESSION: "No active session for slash command.",
  HELP_SUMMARY: "Commands: /help, /mode <read-only|auto|full-access>, /clear, /plan <title>",
  INVALID_MODE: "Invalid mode. Use read-only, auto, or full-access.",
  NO_SESSION_TO_UPDATE: "No session to update mode.",
  SESSION_CLEARED: "Session messages cleared.",
} as const;

export const formatModeUpdatedMessage = (mode: SessionMode): string => `Mode updated to ${mode}.`;

export const formatPlanCreatedMessage = (title: string): string => `Plan created: ${title}`;

export const formatUnknownCommandMessage = (command: string): string =>
  `Unknown command: ${command}`;
