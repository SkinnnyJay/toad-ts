import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { Message } from "@/types/domain";

const MAX_CONTEXT_CHARS = 1000;
const MAX_SUGGESTIONS = 3;

/**
 * Generate simple next-step suggestions based on conversation context.
 * For full AI-based suggestions, this would delegate to a small model.
 */
export const generateSuggestions = (messages: Message[]): string[] => {
  if (messages.length === 0) return [];

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === MESSAGE_ROLE.ASSISTANT && !m.isStreaming);
  if (!lastAssistant) return [];

  const lastText = lastAssistant.content
    .filter((b) => b.type === CONTENT_BLOCK_TYPE.TEXT)
    .map((b) => ("text" in b ? b.text : ""))
    .join(" ")
    .slice(0, MAX_CONTEXT_CHARS);

  const suggestions: string[] = [];

  // Heuristic: detect common patterns in assistant responses
  if (lastText.includes("error") || lastText.includes("failed") || lastText.includes("bug")) {
    suggestions.push("Can you fix this error?");
    suggestions.push("What's causing this issue?");
  }

  if (lastText.includes("test") || lastText.includes("spec")) {
    suggestions.push("Run the tests to verify");
    suggestions.push("Add more test cases for edge cases");
  }

  if (lastText.includes("refactor") || lastText.includes("improve")) {
    suggestions.push("Apply these improvements");
    suggestions.push("Are there other areas to refactor?");
  }

  if (
    lastText.includes("created") ||
    lastText.includes("added") ||
    lastText.includes("implemented")
  ) {
    suggestions.push("Add tests for this new code");
    suggestions.push("Review the changes for issues");
  }

  // Generic fallbacks
  if (suggestions.length === 0) {
    suggestions.push("Continue with the next step");
    suggestions.push("Review what we've done so far");
    suggestions.push("Are there any issues to address?");
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
};

/**
 * Build a prompt for AI-based suggestion generation.
 * Used with the small model for higher-quality suggestions.
 */
export const buildSuggestionPrompt = (messages: Message[]): string => {
  const context = messages
    .slice(-4)
    .map((m) => {
      const text = m.content
        .filter((b) => b.type === CONTENT_BLOCK_TYPE.TEXT)
        .map((b) => ("text" in b ? b.text : ""))
        .join(" ");
      return `[${m.role}]: ${text.slice(0, 200)}`;
    })
    .join("\n");

  return `Based on this conversation, suggest 1-3 short next-step prompts the user might want to send. Return only the suggestions, one per line, no numbering or bullets.\n\n${context}`;
};
