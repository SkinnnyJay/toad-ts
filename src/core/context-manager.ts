import type { AppConfig } from "@/config/app-config";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { Message, SessionId } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("ContextManager");

/** Average characters per token for estimation (GPT/Claude family) */
const CHARS_PER_TOKEN = 4;

export interface ContextStats {
  tokens: number;
  chars: number;
  bytes: number;
  messageCount: number;
  userTokens: number;
  assistantTokens: number;
  toolTokens: number;
}

export interface ContextBudget {
  used: number;
  limit: number;
  ratio: number;
  level: "low" | "medium" | "high" | "critical";
}

export interface PruneResult {
  pruned: number;
  savedTokens: number;
}

const CONTEXT_LEVEL_THRESHOLDS = {
  MEDIUM: 0.5,
  HIGH: 0.8,
  CRITICAL: 0.95,
} as const;

const DEFAULT_CONTEXT_LIMIT = 128_000;

const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

const extractTextFromMessage = (message: Message): string => {
  const parts: string[] = [];
  for (const block of message.content) {
    switch (block.type) {
      case CONTENT_BLOCK_TYPE.TEXT:
      case CONTENT_BLOCK_TYPE.THINKING:
      case CONTENT_BLOCK_TYPE.CODE:
        if (block.text) parts.push(block.text);
        break;
      case CONTENT_BLOCK_TYPE.TOOL_CALL:
        if (block.name) parts.push(block.name);
        if (block.arguments) parts.push(JSON.stringify(block.arguments));
        if (block.result) parts.push(JSON.stringify(block.result));
        break;
      case CONTENT_BLOCK_TYPE.RESOURCE_LINK:
        if (block.name) parts.push(block.name);
        if (block.uri) parts.push(block.uri);
        break;
      case CONTENT_BLOCK_TYPE.RESOURCE:
        if ("text" in block.resource) parts.push(block.resource.text);
        break;
      default:
        break;
    }
  }
  return parts.join(" ");
};

export const computeContextStats = (messages: Message[]): ContextStats => {
  let chars = 0;
  let userTokens = 0;
  let assistantTokens = 0;
  let toolTokens = 0;

  for (const message of messages) {
    const text = extractTextFromMessage(message);
    const textChars = text.length;
    const tokens = estimateTokens(text);
    chars += textChars;

    if (message.role === MESSAGE_ROLE.USER) {
      userTokens += tokens;
    } else if (message.role === MESSAGE_ROLE.ASSISTANT) {
      assistantTokens += tokens;
    } else {
      toolTokens += tokens;
    }
  }

  const totalTokens = userTokens + assistantTokens + toolTokens;
  const encoder = new TextEncoder();
  const bytes = messages.reduce(
    (sum, message) => sum + encoder.encode(extractTextFromMessage(message)).byteLength,
    0
  );

  return {
    tokens: totalTokens,
    chars,
    bytes,
    messageCount: messages.length,
    userTokens,
    assistantTokens,
    toolTokens,
  };
};

export const computeContextBudget = (stats: ContextStats, contextLimit?: number): ContextBudget => {
  const limit = contextLimit ?? DEFAULT_CONTEXT_LIMIT;
  const ratio = limit > 0 ? stats.tokens / limit : 0;

  let level: ContextBudget["level"] = "low";
  if (ratio >= CONTEXT_LEVEL_THRESHOLDS.CRITICAL) {
    level = "critical";
  } else if (ratio >= CONTEXT_LEVEL_THRESHOLDS.HIGH) {
    level = "high";
  } else if (ratio >= CONTEXT_LEVEL_THRESHOLDS.MEDIUM) {
    level = "medium";
  }

  return { used: stats.tokens, limit, ratio, level };
};

export const shouldAutoCompact = (
  budget: ContextBudget,
  compactionConfig: AppConfig["compaction"]
): boolean => {
  if (!compactionConfig.auto) return false;
  return budget.ratio >= compactionConfig.threshold;
};

/**
 * Prune tool output from old messages to reduce context.
 * Replaces large tool results with a summary placeholder.
 */
export const pruneToolOutputs = (messages: Message[], preserveRecent: number): PruneResult => {
  const TOOL_RESULT_PRUNE_THRESHOLD = 500;
  const pruneTarget = messages.length - preserveRecent;
  let pruned = 0;
  let savedTokens = 0;

  for (let i = 0; i < pruneTarget; i++) {
    const message = messages[i];
    if (!message) continue;

    let mutated = false;
    const newContent = message.content.map((block) => {
      if (block.type !== CONTENT_BLOCK_TYPE.TOOL_CALL) return block;
      const result = block.result;
      if (!result) return block;
      const resultStr = typeof result === "string" ? result : JSON.stringify(result);
      if (resultStr.length < TOOL_RESULT_PRUNE_THRESHOLD) return block;

      const originalTokens = estimateTokens(resultStr);
      const summary = `[Output truncated: ${originalTokens} tokens]`;
      savedTokens += originalTokens - estimateTokens(summary);
      pruned += 1;
      mutated = true;
      return { ...block, result: summary };
    });

    if (mutated) {
      messages[i] = { ...message, content: newContent };
    }
  }

  if (pruned > 0) {
    logger.info("Pruned tool outputs", { pruned, savedTokens });
  }
  return { pruned, savedTokens };
};

export class ContextManager {
  private contextLimits = new Map<SessionId, number>();

  setContextLimit(sessionId: SessionId, limit: number): void {
    this.contextLimits.set(sessionId, limit);
  }

  getContextLimit(sessionId: SessionId): number {
    return this.contextLimits.get(sessionId) ?? DEFAULT_CONTEXT_LIMIT;
  }

  computeStats(messages: Message[]): ContextStats {
    return computeContextStats(messages);
  }

  computeBudget(sessionId: SessionId, messages: Message[]): ContextBudget {
    const stats = computeContextStats(messages);
    const limit = this.getContextLimit(sessionId);
    return computeContextBudget(stats, limit);
  }

  shouldCompact(
    sessionId: SessionId,
    messages: Message[],
    config: AppConfig["compaction"]
  ): boolean {
    const budget = this.computeBudget(sessionId, messages);
    return shouldAutoCompact(budget, config);
  }
}
