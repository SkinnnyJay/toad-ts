import { LIMIT } from "@/config/limits";
import type { Session, SessionMode } from "@/types/domain";

export const SLASH_COMMAND_MESSAGE = {
  NO_ACTIVE_SESSION: "No active session for slash command.",
  NO_ACTIVE_CLIENT: "No active agent connection for slash command.",
  HELP_SUMMARY:
    "Commands: /help, /connect, /sessions, /new, /rename, /editor, /memory, /mode <read-only|auto|full-access>, /models <id>, /details, /thinking, /themes, /context, /doctor, /debug, /stats, /cost, /copy, /share, /unshare, /undo, /redo, /rewind <count|list|delete>, /clear, /plan <title>, /compact",
  INVALID_MODE: "Invalid mode. Use read-only, auto, or full-access.",
  NO_SESSION_TO_UPDATE: "No session to update mode.",
  SESSION_CLEARED: "Session messages cleared.",
  SESSION_RENAME_MISSING: "Provide a new session title.",
  NO_MODEL_CONFIGURED: "No model configured for this session.",
  NO_MODELS_AVAILABLE: "No available models reported by the agent.",
  EDITOR_NOT_CONFIGURED: "No editor configured (set VISUAL or EDITOR).",
  EDITOR_EMPTY: "Editor closed without content.",
  THEMES_NOT_AVAILABLE: "Theme selection is not yet available.",
  COMPACT_STARTING: "Starting compaction session...",
  COMPACT_FAILED: "Compaction failed.",
  MEMORY_NOT_AVAILABLE: "Memory editing is not available.",
  MEMORY_OPEN_FAILED: "Failed to open memory file.",
  COPY_NOT_AVAILABLE: "Clipboard copy is not available.",
  COPY_FAILED: "Failed to copy to clipboard.",
  COPY_NO_CONTENT: "No assistant response available to copy.",
  SHARE_FAILED: "Failed to share session.",
  UNSHARE_FAILED: "Failed to unshare session.",
  CHECKPOINT_NOT_AVAILABLE: "Checkpointing is not available.",
  CHECKPOINTS_EMPTY: "No checkpoints available.",
  CHECKPOINT_DELETE_FAILED: "Failed to delete checkpoint.",
  CHECKPOINT_DELETE_MISSING: "Provide a checkpoint id to delete.",
  UNDO_NOT_AVAILABLE: "Undo is not available.",
  REDO_NOT_AVAILABLE: "Redo is not available.",
  REWIND_NOT_AVAILABLE: "Rewind is not available.",
  NO_MESSAGES_TO_UNDO: "No messages available to undo.",
  NO_MESSAGES_TO_REDO: "No messages available to redo.",
  INVALID_REWIND_COUNT: "Provide a valid rewind count.",
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

export const formatDoctorMessage = (lines: string[]): string =>
  `Doctor check:\n${lines.join("\n")}`;

export const formatDebugMessage = (lines: string[]): string => `Debug info:\n${lines.join("\n")}`;

export const formatContextMessage = (lines: string[]): string =>
  `Context usage:\n${lines.join("\n")}`;

export const formatStatsMessage = (lines: string[]): string =>
  `Session stats:\n${lines.join("\n")}`;

export const formatCostMessage = (lines: string[]): string => `Cost estimate:\n${lines.join("\n")}`;

export const formatCopySuccessMessage = (): string => "Copied last response to clipboard.";

export const formatMemoryOpenedMessage = (fileLabel: string): string =>
  `Opened memory file: ${fileLabel}.`;

export const formatCompactionCompleteMessage = (sessionId: string): string =>
  `Compaction session created: ${sessionId}.`;

export const formatUndoMessage = (count: number): string =>
  `Undid ${count} message${count === 1 ? "" : "s"}.`;

export const formatRedoMessage = (count: number): string =>
  `Redid ${count} message${count === 1 ? "" : "s"}.`;

export const formatRewindMessage = (count: number): string =>
  `Rewound ${count} message${count === 1 ? "" : "s"}.`;

export const formatShareMessage = (filePath: string): string => `Session shared to ${filePath}.`;

export const formatUnshareMessage = (filePath: string): string =>
  `Session unshared from ${filePath}.`;

export const formatCheckpointDeletedMessage = (checkpointId: string): string =>
  `Checkpoint deleted: ${checkpointId}.`;

export const formatCheckpointListMessage = (
  checkpoints: Array<{ id: string; createdAt: number; prompt?: string }>
): string => {
  if (checkpoints.length === 0) {
    return SLASH_COMMAND_MESSAGE.CHECKPOINTS_EMPTY;
  }
  const lines = checkpoints.map((checkpoint, index) => {
    const timestamp = new Date(checkpoint.createdAt).toLocaleString();
    const prompt = checkpoint.prompt ? ` - ${checkpoint.prompt}` : "";
    return `${index + 1}. ${checkpoint.id} (${timestamp})${prompt}`;
  });
  return `Checkpoints:\n${lines.join("\n")}`;
};

export const formatUnknownCommandMessage = (command: string): string =>
  `Unknown command: ${command}`;
