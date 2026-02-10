import { LIMIT } from "@/config/limits";
import { REWIND_ACTION, type RewindAction } from "@/constants/rewind-actions";
import { REWIND_MODE, type RewindMode } from "@/constants/rewind-modes";
import {
  SLASH_COMMAND_MESSAGE,
  formatCheckpointDeletedMessage,
  formatCheckpointListMessage,
  formatRedoMessage,
  formatRewindMessage,
  formatUndoMessage,
} from "@/constants/slash-command-messages";
import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import { CheckpointIdSchema } from "@/types/domain";
import type { Message, SessionId } from "@/types/domain";
import { extractBlockText } from "./slash-command-helpers";

export interface CheckpointCommandDeps {
  sessionId?: SessionId;
  checkpointManager?: CheckpointManager;
  appendSystemMessage: (text: string) => void;
  getMessagesForSession: (sessionId: SessionId) => Message[];
  runSummary?: (prompt: string, sessionId: SessionId) => Promise<SessionId | null>;
}

const resolveMode = (value?: string): RewindMode => {
  switch (value) {
    case REWIND_MODE.CODE:
      return REWIND_MODE.CODE;
    case REWIND_MODE.CONVERSATION:
      return REWIND_MODE.CONVERSATION;
    case REWIND_MODE.SUMMARIZE:
      return REWIND_MODE.SUMMARIZE;
    default:
      return REWIND_MODE.BOTH;
  }
};

const parseRewindArgs = (
  args: string[]
): { action: RewindAction; count: number; mode: RewindMode; targetId?: string } => {
  const action = args[0];
  if (action === REWIND_ACTION.LIST) {
    return { action: REWIND_ACTION.LIST, count: 0, mode: REWIND_MODE.BOTH };
  }
  if (action === REWIND_ACTION.DELETE) {
    return {
      action: REWIND_ACTION.DELETE,
      count: 0,
      mode: REWIND_MODE.BOTH,
      targetId: args[1],
    };
  }
  const first = args[0];
  const second = args[1];
  const parsedCount = first ? Number.parseInt(first, 10) : Number.NaN;
  if (Number.isFinite(parsedCount) && parsedCount > 0) {
    return {
      action: REWIND_ACTION.REWIND,
      count: parsedCount,
      mode: resolveMode(second),
    };
  }
  if (first) {
    return {
      action: REWIND_ACTION.REWIND,
      count: LIMIT.REWIND_DEFAULT_COUNT,
      mode: resolveMode(first),
    };
  }
  return {
    action: REWIND_ACTION.REWIND,
    count: LIMIT.REWIND_DEFAULT_COUNT,
    mode: REWIND_MODE.BOTH,
  };
};

const buildSummaryPrompt = (
  sessionId: SessionId,
  getMessages: CheckpointCommandDeps["getMessagesForSession"]
): string => {
  const messages = getMessages(sessionId);
  const lines = messages.map((message) => {
    const content = message.content.map(extractBlockText).join("\n");
    return `${message.role}: ${content}`;
  });
  return `Summarize the conversation so far:\n\n${lines.join("\n")}`;
};

export const handleUndoCommand = async (
  deps: CheckpointCommandDeps,
  mode: RewindMode
): Promise<void> => {
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  if (!deps.checkpointManager) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CHECKPOINT_NOT_AVAILABLE);
    return;
  }
  const result = await deps.checkpointManager.undo(deps.sessionId, mode);
  if (!result) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_MESSAGES_TO_UNDO);
    return;
  }
  deps.appendSystemMessage(formatUndoMessage(1));
};

export const handleRedoCommand = async (
  deps: CheckpointCommandDeps,
  mode: RewindMode
): Promise<void> => {
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  if (!deps.checkpointManager) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CHECKPOINT_NOT_AVAILABLE);
    return;
  }
  const result = await deps.checkpointManager.redo(deps.sessionId, mode);
  if (!result) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_MESSAGES_TO_REDO);
    return;
  }
  deps.appendSystemMessage(formatRedoMessage(1));
};

export const handleRewindCommand = async (
  args: string[],
  deps: CheckpointCommandDeps
): Promise<void> => {
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  if (!deps.checkpointManager) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CHECKPOINT_NOT_AVAILABLE);
    return;
  }
  const parsed = parseRewindArgs(args);
  if (parsed.action === REWIND_ACTION.LIST) {
    const checkpoints = await deps.checkpointManager.listCheckpoints(deps.sessionId);
    deps.appendSystemMessage(formatCheckpointListMessage(checkpoints));
    return;
  }
  if (parsed.action === REWIND_ACTION.DELETE) {
    if (!parsed.targetId) {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CHECKPOINT_DELETE_MISSING);
      return;
    }
    const parsedId = CheckpointIdSchema.safeParse(parsed.targetId);
    if (!parsedId.success) {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CHECKPOINT_DELETE_FAILED);
      return;
    }
    const removed = await deps.checkpointManager.deleteCheckpoint(deps.sessionId, parsedId.data);
    deps.appendSystemMessage(
      removed
        ? formatCheckpointDeletedMessage(parsedId.data)
        : SLASH_COMMAND_MESSAGE.CHECKPOINT_DELETE_FAILED
    );
    return;
  }
  const result = await deps.checkpointManager.rewind(deps.sessionId, parsed.count, parsed.mode);
  if (!result) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_MESSAGES_TO_UNDO);
    return;
  }
  deps.appendSystemMessage(formatRewindMessage(parsed.count));
  if (parsed.mode === REWIND_MODE.SUMMARIZE && deps.runSummary) {
    const prompt = buildSummaryPrompt(deps.sessionId, deps.getMessagesForSession);
    void deps.runSummary(prompt, deps.sessionId);
  }
};
