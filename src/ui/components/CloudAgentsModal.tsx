import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import type { SelectOption } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const CLOUD_AGENTS_MODAL_MESSAGE = {
  REFRESH_UNAVAILABLE: "Cloud refresh is not available.",
  STATUS_UNAVAILABLE: "Cloud status lookup is not available.",
  STOP_UNAVAILABLE: "Cloud stop is not available.",
  FOLLOWUP_UNAVAILABLE: "Cloud follow-up is not available.",
  FOLLOWUP_PROMPT_REQUIRED: "Type a follow-up prompt in Filter before pressing Ctrl+F.",
  REFRESHING: "Refreshing cloud agents…",
  EMPTY: "No cloud agents available.",
} as const;

export interface CloudAgentListItem {
  id: string;
  status: string;
  model?: string;
  updatedAt?: string;
}

interface CloudAgentsModalProps {
  isOpen: boolean;
  agents: CloudAgentListItem[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRefresh?: () => Promise<void> | void;
  onFetchStatus?: (agentId: string) => Promise<CloudAgentListItem> | CloudAgentListItem;
  onStopAgent?: (agentId: string) => Promise<void> | void;
  onSendFollowup?: (agentId: string, prompt: string) => Promise<void> | void;
}

export function CloudAgentsModal({
  isOpen,
  agents,
  loading = false,
  error = null,
  onClose,
  onRefresh,
  onFetchStatus,
  onStopAgent,
  onSendFollowup,
}: CloudAgentsModalProps): ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const options = useMemo<SelectOption[]>(() => {
    return agents.map((agent) => {
      const details = [agent.status, agent.model, agent.updatedAt]
        .filter((value): value is string => Boolean(value))
        .join(" · ");
      return {
        name: agent.id,
        description: details,
        value: agent.id,
      };
    });
  }, [agents]);

  useEffect(() => {
    if (selectedIndex >= agents.length) {
      setSelectedIndex(0);
    }
  }, [agents.length, selectedIndex]);

  const runAction = async (
    action: () => Promise<void> | void,
    unavailableMessage: string
  ): Promise<void> => {
    if (!action) {
      setStatusMessage(unavailableMessage);
      return;
    }
    setIsBusy(true);
    try {
      await action();
    } catch (actionError) {
      setStatusMessage(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setIsBusy(false);
    }
  };

  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === KEY_NAME.ESCAPE || (key.ctrl && key.name === KEYBOARD_INPUT.SKIP_LOWER)) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
      return;
    }
    if (key.name === KEY_NAME.BACKSPACE) {
      key.preventDefault();
      key.stopPropagation();
      setQuery((current) => current.slice(0, -1));
      return;
    }

    if (key.ctrl && key.name === KEY_NAME.R) {
      key.preventDefault();
      key.stopPropagation();
      if (isBusy) {
        return;
      }
      setStatusMessage(CLOUD_AGENTS_MODAL_MESSAGE.REFRESHING);
      void runAction(async () => {
        if (!onRefresh) {
          throw new Error(CLOUD_AGENTS_MODAL_MESSAGE.REFRESH_UNAVAILABLE);
        }
        await onRefresh();
        setStatusMessage("Cloud agents refreshed.");
      }, CLOUD_AGENTS_MODAL_MESSAGE.REFRESH_UNAVAILABLE);
      return;
    }

    const selectedAgent = agents[selectedIndex];
    if (!selectedAgent) {
      const typedKey = key.sequence ?? (key.name === KEY_NAME.SPACE ? " " : key.name);
      if (!key.ctrl && !key.meta && typedKey && typedKey.length === 1) {
        setQuery((current) => current + typedKey);
      }
      return;
    }

    if (key.ctrl && key.name === KEY_NAME.X) {
      key.preventDefault();
      key.stopPropagation();
      if (isBusy) {
        return;
      }
      setStatusMessage(`Stopping ${selectedAgent.id}…`);
      void runAction(async () => {
        if (!onStopAgent) {
          throw new Error(CLOUD_AGENTS_MODAL_MESSAGE.STOP_UNAVAILABLE);
        }
        await onStopAgent(selectedAgent.id);
        setStatusMessage(`Stop requested for ${selectedAgent.id}.`);
      }, CLOUD_AGENTS_MODAL_MESSAGE.STOP_UNAVAILABLE);
      return;
    }

    if (key.ctrl && key.name === KEY_NAME.F) {
      key.preventDefault();
      key.stopPropagation();
      if (isBusy) {
        return;
      }
      const prompt = query.trim();
      if (!prompt) {
        setStatusMessage(CLOUD_AGENTS_MODAL_MESSAGE.FOLLOWUP_PROMPT_REQUIRED);
        return;
      }
      setStatusMessage(`Sending follow-up to ${selectedAgent.id}…`);
      void runAction(async () => {
        if (!onSendFollowup) {
          throw new Error(CLOUD_AGENTS_MODAL_MESSAGE.FOLLOWUP_UNAVAILABLE);
        }
        await onSendFollowup(selectedAgent.id, prompt);
        setStatusMessage(`Follow-up sent to ${selectedAgent.id}.`);
      }, CLOUD_AGENTS_MODAL_MESSAGE.FOLLOWUP_UNAVAILABLE);
      return;
    }

    if (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) {
      key.preventDefault();
      key.stopPropagation();
      if (isBusy) {
        return;
      }
      setStatusMessage(`Fetching status for ${selectedAgent.id}…`);
      void runAction(async () => {
        if (!onFetchStatus) {
          throw new Error(CLOUD_AGENTS_MODAL_MESSAGE.STATUS_UNAVAILABLE);
        }
        const details = await onFetchStatus(selectedAgent.id);
        setStatusMessage(
          `Status: ${details.id} ${details.status}${details.model ? ` (${details.model})` : ""}`
        );
      }, CLOUD_AGENTS_MODAL_MESSAGE.STATUS_UNAVAILABLE);
      return;
    }

    const typedKey = key.sequence ?? (key.name === KEY_NAME.SPACE ? " " : key.name);
    if (!key.ctrl && !key.meta && typedKey && typedKey.length === 1) {
      setQuery((current) => current + typedKey);
    }
  });

  if (!isOpen) {
    return null;
  }

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      minHeight={UI.POPUP_HEIGHT}
      width={UI.POPUP_WIDTH}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Cloud Agents (Esc/Ctrl+S to close)
        </text>
        <text attributes={TextAttributes.DIM}>
          {agents.length} agent{agents.length === 1 ? "" : "s"}
        </text>
      </box>
      <text attributes={TextAttributes.DIM}>Follow-up prompt: {query || "(none)"}</text>
      {loading ? <text attributes={TextAttributes.DIM}>Loading cloud agents…</text> : null}
      {error ? <text fg={COLOR.YELLOW}>{error}</text> : null}
      {agents.length === 0 ? (
        <text attributes={TextAttributes.DIM}>{CLOUD_AGENTS_MODAL_MESSAGE.EMPTY}</text>
      ) : (
        <select
          options={options}
          selectedIndex={selectedIndex}
          focused={true}
          onChange={(index) => setSelectedIndex(index)}
          style={UI.FULL_WIDTH_STYLE}
        />
      )}
      {statusMessage ? (
        <box marginTop={1}>
          <text fg={COLOR.GRAY}>{statusMessage}</text>
        </box>
      ) : null}
      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>
          ↑/↓ select | Enter status | Ctrl+X stop | Ctrl+F follow-up | Ctrl+R refresh
        </text>
      </box>
    </box>
  );
}
