import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { Message } from "@/types/domain";

const MAX_TITLE_LENGTH = 60;
const TITLE_CONTEXT_CHARS = 500;

/**
 * Generate a title for a session based on the first user message.
 * Uses simple heuristic: first line of the first user message, truncated.
 * For LLM-based title generation, use the hidden title agent.
 */
export const generateSessionTitle = (messages: Message[]): string | null => {
  const firstUserMessage = messages.find(
    (message) => message.role === MESSAGE_ROLE.USER && !message.isStreaming
  );
  if (!firstUserMessage) return null;

  const textBlocks = firstUserMessage.content.filter(
    (block) => block.type === CONTENT_BLOCK_TYPE.TEXT
  );
  if (textBlocks.length === 0) return null;

  const text = textBlocks
    .map((block) => ("text" in block ? block.text : ""))
    .join(" ")
    .trim();
  if (!text) return null;

  // Take first line or first N chars
  const firstLine = text.split("\n")[0] ?? text;
  if (firstLine.length <= MAX_TITLE_LENGTH) return firstLine;
  return `${firstLine.slice(0, MAX_TITLE_LENGTH - 3)}...`;
};

/**
 * Build a prompt for the hidden title agent.
 * The agent should return a short, descriptive title.
 */
export const buildTitlePrompt = (messages: Message[]): string => {
  const contextParts: string[] = [];
  let chars = 0;

  for (const message of messages) {
    if (chars >= TITLE_CONTEXT_CHARS) break;
    for (const block of message.content) {
      if (block.type === CONTENT_BLOCK_TYPE.TEXT && "text" in block) {
        const remaining = TITLE_CONTEXT_CHARS - chars;
        const blockText = block.text.slice(0, remaining);
        contextParts.push(`[${message.role}]: ${blockText}`);
        chars += blockText.length;
      }
    }
  }

  return `Generate a short, descriptive title (max ${MAX_TITLE_LENGTH} characters) for this conversation:\n\n${contextParts.join("\n")}`;
};
