import type { AgentInfo } from "@/agents/agent-manager";
import { findHiddenAgentBySuffix } from "@/agents/agent-utils";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { SUMMARY } from "@/constants/agent-ids";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { REWIND_MODE, type RewindMode } from "@/constants/rewind-modes";
import { SLASH_COMMAND_MESSAGE, formatUndoMessage } from "@/constants/slash-command-messages";
import type { CheckpointManager, CheckpointStatus } from "@/store/checkpoints/checkpoint-manager";
import type { AgentId, Message, SessionId } from "@/types/domain";
import { MessageIdSchema } from "@/types/domain";
import { buildSummaryPrompt } from "@/ui/components/chat/slash-command-checkpoints";
import { useCallback, useEffect, useState } from "react";

export interface UseCheckpointUIOptions {
  checkpointManager: CheckpointManager;
  activeSessionId?: SessionId;
  appendMessage: (message: Message) => void;
  getMessagesForSession: (sessionId: SessionId) => Message[];
  agentInfoMap: Map<AgentId, AgentInfo>;
  selectedAgent?: AgentInfo | null;
  subAgentRunner?: SubAgentRunner;
  onCloseRewind: () => void;
}

export interface UseCheckpointUIResult {
  checkpointStatus?: CheckpointStatus;
  handleRewindSelect: (mode: RewindMode) => void;
}

export const useCheckpointUI = ({
  checkpointManager,
  activeSessionId,
  appendMessage,
  getMessagesForSession,
  agentInfoMap,
  selectedAgent,
  subAgentRunner,
  onCloseRewind,
}: UseCheckpointUIOptions): UseCheckpointUIResult => {
  const [checkpointStatus, setCheckpointStatus] = useState<CheckpointStatus | undefined>(undefined);

  const appendSystemMessage = useCallback(
    (text: string) => {
      if (!activeSessionId) {
        return;
      }
      const now = Date.now();
      appendMessage({
        id: MessageIdSchema.parse(`sys-${now}`),
        sessionId: activeSessionId,
        role: MESSAGE_ROLE.SYSTEM,
        content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
        createdAt: now,
        isStreaming: false,
      });
    },
    [activeSessionId, appendMessage]
  );

  const runSummary = useCallback(
    async (prompt: string, session: SessionId) => {
      if (!subAgentRunner) {
        return null;
      }
      const summaryAgent = findHiddenAgentBySuffix(
        Array.from(agentInfoMap.values()),
        SUMMARY,
        selectedAgent?.harnessId
      );
      if (!summaryAgent) {
        return null;
      }
      return subAgentRunner.run({ parentSessionId: session, agent: summaryAgent, prompt });
    },
    [agentInfoMap, selectedAgent?.harnessId, subAgentRunner]
  );

  const refreshCheckpointStatus = useCallback(
    (targetSessionId?: SessionId) => {
      if (!targetSessionId) {
        setCheckpointStatus(undefined);
        return;
      }
      void checkpointManager
        .getStatus(targetSessionId)
        .then((status) => setCheckpointStatus(status))
        .catch(() => setCheckpointStatus(undefined));
    },
    [checkpointManager]
  );

  useEffect(() => {
    refreshCheckpointStatus(activeSessionId);
  }, [activeSessionId, refreshCheckpointStatus]);

  useEffect(() => {
    const unsubscribe = checkpointManager.subscribe((session) => {
      if (session === activeSessionId) {
        refreshCheckpointStatus(activeSessionId);
      }
    });
    return unsubscribe;
  }, [activeSessionId, checkpointManager, refreshCheckpointStatus]);

  const handleRewindSelect = useCallback(
    async (mode: RewindMode) => {
      if (!activeSessionId) {
        appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
        onCloseRewind();
        return;
      }
      const result = await checkpointManager.undo(activeSessionId, mode);
      if (!result) {
        appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_MESSAGES_TO_UNDO);
        onCloseRewind();
        return;
      }
      appendSystemMessage(formatUndoMessage(1));
      if (mode === REWIND_MODE.SUMMARIZE) {
        const prompt = buildSummaryPrompt(activeSessionId, getMessagesForSession);
        void runSummary(prompt, activeSessionId);
      }
      onCloseRewind();
    },
    [
      activeSessionId,
      appendSystemMessage,
      checkpointManager,
      getMessagesForSession,
      onCloseRewind,
      runSummary,
    ]
  );

  return { checkpointStatus, handleRewindSelect };
};
