import type { AgentInfo } from "@/agents/agent-manager";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { TIMEOUT } from "@/config/timeouts";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { INDENT_SPACES } from "@/constants/json-format";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { HookContext, HookDecision, PromptHookRunner } from "@/hooks/hook-manager";
import type { AppStore } from "@/store/app-store";
import type { Message, Session, SessionId } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";
import type { StoreApi } from "zustand";

export interface PromptHookRunnerOptions {
  subAgentRunner?: SubAgentRunner;
  agentInfoMap: Map<AgentInfo["id"], AgentInfo>;
  store: StoreApi<AppStore>;
  timeoutMs?: number;
}

const logger = createClassLogger("HookPromptRunner");

const extractResponseText = (message: Message): string => {
  return message.content
    .filter((block) => block.type === CONTENT_BLOCK_TYPE.TEXT)
    .map((block) => block.text)
    .join("\n")
    .trim();
};

const getLatestAssistantMessage = (messages: Message[]): Message | null => {
  const assistantMessages = messages.filter(
    (message) => message.role === MESSAGE_ROLE.ASSISTANT && !message.isStreaming
  );
  return assistantMessages.length > 0
    ? (assistantMessages[assistantMessages.length - 1] ?? null)
    : null;
};

const waitForHookResponse = async (
  store: StoreApi<AppStore>,
  sessionId: SessionId,
  timeoutMs: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const attemptResolve = (): boolean => {
      const messages = store.getState().getMessagesForSession(sessionId);
      const latest = getLatestAssistantMessage(messages);
      if (!latest) {
        return false;
      }
      resolve(extractResponseText(latest));
      return true;
    };

    if (attemptResolve()) {
      return;
    }

    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Hook prompt timed out."));
    }, timeoutMs);

    const unsubscribe = store.subscribe(() => {
      if (attemptResolve()) {
        clearTimeout(timeout);
        unsubscribe();
      }
    });
  });
};

const resolveAgent = (
  session: Session | undefined,
  agentInfoMap: Map<AgentInfo["id"], AgentInfo>
): AgentInfo | null => {
  if (session?.agentId) {
    const bySession = agentInfoMap.get(session.agentId);
    if (bySession && !bySession.hidden) {
      return bySession;
    }
  }
  return Array.from(agentInfoMap.values()).find((agent) => !agent.hidden) ?? null;
};

const buildPrompt = (prompt: string, context: HookContext): string => {
  const payload = JSON.stringify(context.payload, null, INDENT_SPACES);
  return `${prompt}\n\nContext:\n${payload}\n\nRespond with allow or deny.`;
};

const parseDecision = (text: string): HookDecision => {
  const normalized = text.trim().toLowerCase();
  if (normalized.startsWith("deny") || normalized.startsWith("block") || normalized === "no") {
    return { allow: false, message: text.trim() };
  }
  if (normalized.startsWith("allow") || normalized.startsWith("approve") || normalized === "yes") {
    return { allow: true, message: text.trim() };
  }
  return { allow: true, message: text.trim() };
};

export const createPromptHookRunner = ({
  subAgentRunner,
  agentInfoMap,
  store,
  timeoutMs = TIMEOUT.HOOK_PROMPT_MS,
}: PromptHookRunnerOptions): PromptHookRunner => {
  return async (prompt, context): Promise<HookDecision> => {
    if (!subAgentRunner) {
      return { allow: true };
    }
    if (!context.sessionId) {
      logger.warn("Prompt hook skipped: missing session id.");
      return { allow: true };
    }

    const session = store.getState().getSession(context.sessionId);
    const agent = resolveAgent(session, agentInfoMap);
    if (!agent) {
      logger.warn("Prompt hook skipped: no agent available.");
      return { allow: true };
    }

    try {
      const childSessionId = await subAgentRunner.run({
        agent,
        prompt: buildPrompt(prompt, context),
        parentSessionId: context.sessionId,
      });
      const response = await waitForHookResponse(store, childSessionId, timeoutMs);
      return parseDecision(response);
    } catch (error) {
      logger.warn("Prompt hook failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { allow: true };
    }
  };
};
