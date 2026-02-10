import { mkdir, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { FILE_PATH } from "@/constants/file-paths";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { ContentBlock, Message, Session, SessionId } from "@/types/domain";
import { createDefaultTokenizerAdapter } from "@/utils/token-optimizer/tokenizer";
import { findUp } from "find-up";

const ROLE_LABEL: Record<Message["role"], string> = {
  [MESSAGE_ROLE.USER]: "User",
  [MESSAGE_ROLE.ASSISTANT]: "Assistant",
  [MESSAGE_ROLE.SYSTEM]: "System",
};

export const extractBlockText = (block: ContentBlock): string => {
  switch (block.type) {
    case CONTENT_BLOCK_TYPE.TEXT:
    case CONTENT_BLOCK_TYPE.THINKING:
      return block.text ?? "";
    case CONTENT_BLOCK_TYPE.CODE:
      return block.text ?? "";
    case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
      return block.name ?? block.uri ?? "";
    case CONTENT_BLOCK_TYPE.RESOURCE:
      return "text" in block.resource ? (block.resource.text ?? "") : "";
    case CONTENT_BLOCK_TYPE.TOOL_CALL:
      return "";
    default:
      return "";
  }
};

export const buildContextStats = (
  messages: Message[]
): { tokens: number; chars: number; bytes: number } => {
  const tokenizer = createDefaultTokenizerAdapter();
  const combined = messages
    .map((message) => message.content.map(extractBlockText).join("\n"))
    .join("\n");
  const estimate = tokenizer.estimate(combined);
  return {
    tokens: estimate.tokenCount,
    chars: estimate.charCount,
    bytes: estimate.byteSize,
  };
};

export const orderMessages = (messages: Message[]): Message[] =>
  messages
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id)));

export const resolveSharedSessionPath = (sessionId: SessionId): string =>
  path.join(homedir(), FILE_PATH.TOADSTOOL_DIR, FILE_PATH.SHARED_SESSIONS_DIR, `${sessionId}.md`);

export const formatSessionMarkdown = (session: Session, messages: Message[]): string => {
  const title = session.title ?? session.id;
  const createdAt = new Date(session.createdAt).toISOString();
  const updatedAt = new Date(session.updatedAt).toISOString();
  const header = `# ${title}\n\n- Session ID: ${session.id}\n- Created: ${createdAt}\n- Updated: ${updatedAt}\n\n`;
  const body = orderMessages(messages)
    .map((message) => {
      const roleLabel = ROLE_LABEL[message.role];
      const content = message.content.map(extractBlockText).join("\n").trim();
      const safeContent = content.length > 0 ? content : "_(no content)_";
      return `## ${roleLabel}\n\n${safeContent}\n`;
    })
    .join("\n");
  return `${header}${body}`.trim();
};

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

export const removeSharedSessionFile = async (filePath: string): Promise<void> => {
  await rm(filePath);
};

export const ensureSharedSessionDir = async (filePath: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
};

export const resolveMemoryFilePath = async (fileName: string): Promise<string> => {
  const found = await findUp(fileName, { cwd: process.cwd() });
  return found ?? path.join(process.cwd(), fileName);
};
