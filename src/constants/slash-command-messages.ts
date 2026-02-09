import { LIMIT } from "@/config/limits";
import type { Session, SessionMode } from "@/types/domain";

export const SLASH_COMMAND_MESSAGE = {
  NO_ACTIVE_SESSION: "No active session for slash command.",
  NO_ACTIVE_CLIENT: "No active agent connection for slash command.",
  HELP_SUMMARY:
    "Commands: /help, /connect, /sessions, /new, /rename, /editor, /mode <read-only|auto|full-access>, /models <id>, /details, /thinking, /themes, /clear, /plan <title>",
  INVALID_MODE: "Invalid mode. Use read-only, auto, or full-access.",
  NO_SESSION_TO_UPDATE: "No session to update mode.",
  SESSION_CLEARED: "Session messages cleared.",
  SESSION_RENAME_MISSING: "Provide a new session title.",
  NO_MODEL_CONFIGURED: "No model configured for this session.",
  NO_MODELS_AVAILABLE: "No available models reported by the agent.",
  EDITOR_NOT_CONFIGURED: "No editor configured (set VISUAL or EDITOR).",
  EDITOR_EMPTY: "Editor closed without content.",
  THEMES_NOT_AVAILABLE: "Theme selection is not yet available.",
} as const;

export const formatModeUpdatedMessage = (mode: SessionMode): string => `Mode updated to ${mode}.`;

export const formatPlanCreatedMessage = (title: string): string => `Plan created: ${title}`;

export const formatSessionCreatedMessage = (sessionId: string): string =>
  `New session created: ${sessionId}`;

export const formatSessionCreateFailedMessage = (message: string): string =>
  `Failed to create session: ${message}`;

export const formatSessionRenamedMessage = (title: string): string =>
  `Session renamed to ${title}.`;

export const formatSessionListMessage = (sessions: Session[]): string => {
  if (sessions.length === 0) {
    return "No sessions available.";
  }
  const sorted = sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const preview = sorted.slice(0, LIMIT.SESSION_LIST_PREVIEW);
  const lines = preview.map((session, index) => {
    const title = session.title ? ` - ${session.title}` : "";
    return `${index + 1}. ${session.id}${title}`;
  });
  const suffix =
    sessions.length > preview.length ? `\n… ${sessions.length - preview.length} more sessions` : "";
  return `Sessions:\n${lines.join("\n")}${suffix}`;
};

export const formatModelCurrentMessage = (model: string): string => `Current model: ${model}.`;

export const formatModelUpdatedMessage = (model: string): string => `Model set to ${model}.`;

export const formatModelUpdateFailedMessage = (message: string): string =>
  `Failed to update model: ${message}`;

export const formatModelListMessage = (
  models: Array<{ modelId: string; name: string }>,
  currentModel?: string
): string => {
  if (models.length === 0) {
    return SLASH_COMMAND_MESSAGE.NO_MODELS_AVAILABLE;
  }
  const lines = models.map((model) => {
    const current = currentModel && model.modelId === currentModel ? " (current)" : "";
    return `- ${model.modelId} (${model.name})${current}`;
  });
  return `Available models:\n${lines.join("\n")}`;
};

export const formatToolDetailsMessage = (enabled: boolean): string =>
  `Tool details ${enabled ? "shown" : "hidden"}.`;

export const formatThinkingMessage = (enabled: boolean): string =>
  `Thinking blocks ${enabled ? "shown" : "hidden"}.`;

export const formatUnknownCommandMessage = (command: string): string =>
  `Unknown command: ${command}`;
