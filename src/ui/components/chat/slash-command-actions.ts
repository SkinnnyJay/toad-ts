import { writeFile } from "node:fs/promises";

import { ENCODING } from "@/constants/encodings";
import { MEMORY_FILE, MEMORY_TARGET } from "@/constants/memory-files";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import {
  SLASH_COMMAND_MESSAGE,
  formatCopySuccessMessage,
  formatMemoryOpenedMessage,
  formatShareMessage,
  formatUnshareMessage,
} from "@/constants/slash-command-messages";
import type { Message, Session, SessionId } from "@/types/domain";
import {
  ensureSharedSessionDir,
  extractBlockText,
  fileExists,
  formatSessionMarkdown,
  orderMessages,
  removeSharedSessionFile,
  resolveMemoryFilePath,
  resolveSharedSessionPath,
} from "./slash-command-helpers";

interface MemoryCommandDeps {
  appendSystemMessage: (text: string) => void;
  openMemoryFile?: (filePath: string) => Promise<boolean>;
}

interface CopyCommandDeps {
  appendSystemMessage: (text: string) => void;
  copyToClipboard?: (text: string) => Promise<boolean>;
  getMessagesForSession: (sessionId: SessionId) => Message[];
}

interface ShareCommandDeps {
  appendSystemMessage: (text: string) => void;
  getSession: (sessionId: SessionId) => Session | undefined;
  getMessagesForSession: (sessionId: SessionId) => Message[];
}

interface UnshareCommandDeps {
  appendSystemMessage: (text: string) => void;
}

export const runMemoryCommand = async (
  target: string | undefined,
  deps: MemoryCommandDeps
): Promise<void> => {
  if (!deps.openMemoryFile) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.MEMORY_NOT_AVAILABLE);
    return;
  }
  const fileNames =
    target === MEMORY_TARGET.CLAUDE
      ? [MEMORY_FILE.CLAUDE]
      : target === MEMORY_TARGET.BOTH
        ? [MEMORY_FILE.AGENTS, MEMORY_FILE.CLAUDE]
        : [MEMORY_FILE.AGENTS];
  for (const fileName of fileNames) {
    const filePath = await resolveMemoryFilePath(fileName);
    const success = await deps.openMemoryFile(filePath);
    if (success) {
      deps.appendSystemMessage(formatMemoryOpenedMessage(fileName));
    } else {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.MEMORY_OPEN_FAILED);
    }
  }
};

export const runCopyCommand = async (
  sessionId: SessionId | undefined,
  deps: CopyCommandDeps
): Promise<void> => {
  if (!sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  if (!deps.copyToClipboard) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COPY_NOT_AVAILABLE);
    return;
  }
  const messages = orderMessages(deps.getMessagesForSession(sessionId));
  const lastAssistant = messages
    .slice()
    .reverse()
    .find(
      (message) =>
        message.role === MESSAGE_ROLE.ASSISTANT &&
        message.content.some((block) => extractBlockText(block).trim().length > 0)
    );
  if (!lastAssistant) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COPY_NO_CONTENT);
    return;
  }
  const content = lastAssistant.content.map(extractBlockText).join("\n").trim();
  if (!content) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COPY_NO_CONTENT);
    return;
  }
  const success = await deps.copyToClipboard(content);
  if (success) {
    deps.appendSystemMessage(formatCopySuccessMessage());
  } else {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.COPY_FAILED);
  }
};

export const runShareCommand = async (
  sessionId: SessionId | undefined,
  deps: ShareCommandDeps
): Promise<void> => {
  if (!sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  const session = deps.getSession(sessionId);
  if (!session) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  const messages = deps.getMessagesForSession(sessionId);
  const sharedPath = resolveSharedSessionPath(sessionId);
  try {
    await ensureSharedSessionDir(sharedPath);
    const markdown = formatSessionMarkdown(session, messages);
    await writeFile(sharedPath, markdown, ENCODING.UTF8);
    deps.appendSystemMessage(formatShareMessage(sharedPath));
  } catch {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SHARE_FAILED);
  }
};

export const runUnshareCommand = async (
  sessionId: SessionId | undefined,
  deps: UnshareCommandDeps
): Promise<void> => {
  if (!sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  const sharedPath = resolveSharedSessionPath(sessionId);
  try {
    const exists = await fileExists(sharedPath);
    if (!exists) {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.UNSHARE_FAILED);
      return;
    }
    await removeSharedSessionFile(sharedPath);
    deps.appendSystemMessage(formatUnshareMessage(sharedPath));
  } catch {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.UNSHARE_FAILED);
  }
};
