import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { toNormalizedAgentManagementSessions } from "@/core/agent-management/session-summary-mapper";
import { useAppStore } from "@/store/app-store";
import type { AgentManagementSession } from "@/types/agent-management.types";
import { type SessionId, SessionIdSchema } from "@/types/domain";
import type { SessionSwitchSeed } from "@/ui/utils/session-switcher";
import { truncateMiddle } from "@/ui/utils/truncate-middle";
import type { SelectOption } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

interface SessionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: SessionId, seedSession?: SessionSwitchSeed) => void;
  onRefreshExternalSessions?: () => Promise<void> | void;
  externalSessions?: AgentManagementSession[];
  externalSessionLoading?: boolean;
  externalSessionError?: string | null;
}

interface SessionEntry {
  id: SessionId;
  title: string;
  searchText: string;
  description: string;
  switchSeed?: SessionSwitchSeed;
}

const toNativeSessionLabel = (session: AgentManagementSession): string => {
  const shortId = session.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH);
  const nativeTitle = session.title?.trim();
  if (!nativeTitle) {
    return `Native: ${shortId}`;
  }
  return `Native: ${shortId} · ${nativeTitle}`;
};

const toDisplayTimestamp = (timestamp: string): string => {
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.valueOf())) {
    return timestamp;
  }
  return parsedDate.toLocaleString();
};

const toExternalSessionErrorLabel = (error: string): string => {
  const trimmedError = error.trim();
  if (trimmedError.length === 0) {
    return "Native sessions unavailable";
  }
  return `Native sessions unavailable: ${truncateMiddle(trimmedError, LIMIT.STRING_TRUNCATE_MEDIUM)}`;
};

export function SessionsPopup({
  isOpen,
  onClose,
  onSelectSession,
  onRefreshExternalSessions,
  externalSessions = [],
  externalSessionLoading = false,
  externalSessionError = null,
}: SessionsPopupProps): ReactNode {
  const sessions = useAppStore(useShallow((state) => Object.values(state.sessions)));
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");

  // Sort sessions by updatedAt descending
  const sortedSessions = useMemo(() => {
    return [...sessions]
      .filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  const uniqueExternalSessions = useMemo(() => {
    return toNormalizedAgentManagementSessions(externalSessions);
  }, [externalSessions]);

  const sessionEntries = useMemo<SessionEntry[]>(() => {
    const localEntries = sortedSessions.map((session) => {
      const sessionTitle = session.title || session.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH);
      const createdAt = new Date(session.createdAt).toLocaleString();
      const updatedAt = new Date(session.updatedAt).toLocaleString();
      const agentLabel = session.agentId?.slice(0, LIMIT.ID_TRUNCATE_LENGTH) || "N/A";
      return {
        id: session.id,
        title: sessionTitle,
        searchText: `${session.id} ${sessionTitle} ${agentLabel}`,
        description: `Agent: ${agentLabel} · Created: ${createdAt} · Updated: ${updatedAt}`,
      };
    });
    const localIds = new Set(localEntries.map((entry) => entry.id));
    const externalEntries: SessionEntry[] = [];
    for (const session of uniqueExternalSessions) {
      const parsedId = SessionIdSchema.safeParse(session.id);
      if (!parsedId.success) {
        continue;
      }
      const sessionId = parsedId.data;
      if (localIds.has(sessionId)) {
        continue;
      }
      const details: string[] = [];
      if (session.title) {
        details.push(session.title);
      }
      if (session.createdAt) {
        details.push(`Created: ${toDisplayTimestamp(session.createdAt)}`);
      }
      if (session.model) {
        details.push(`Model: ${session.model}`);
      }
      if (session.messageCount !== undefined) {
        details.push(`Messages: ${session.messageCount}`);
      }
      const suffix = details.length > 0 ? ` · ${details.join(" · ")}` : "";
      externalEntries.push({
        id: sessionId,
        title: toNativeSessionLabel(session),
        searchText: `${session.id} ${session.title ?? ""} ${session.createdAt ?? ""} ${
          session.model ?? ""
        } ${session.messageCount ?? ""} cursor`,
        description: `Native Cursor session (${session.id})${suffix}`,
        switchSeed: {
          title: session.title,
          createdAt: session.createdAt,
          model: session.model,
        },
      });
    }
    return [...localEntries, ...externalEntries];
  }, [sortedSessions, uniqueExternalSessions]);

  const filteredSessions = useMemo(() => {
    if (!query.trim()) {
      return sessionEntries;
    }
    const normalized = query.trim().toLowerCase();
    return sessionEntries.filter((session) => {
      return session.searchText.toLowerCase().includes(normalized);
    });
  }, [query, sessionEntries]);

  const options = useMemo<SelectOption[]>(() => {
    return filteredSessions.map((session) => {
      return {
        name: session.title,
        description: session.description,
        value: session.id,
      };
    });
  }, [filteredSessions]);

  useEffect(() => {
    if (!currentSessionId) return;
    const idx = filteredSessions.findIndex((session) => session.id === currentSessionId);
    if (idx >= 0) {
      setSelectedIndex(idx);
    }
  }, [currentSessionId, filteredSessions]);

  useEffect(() => {
    if (selectedIndex >= filteredSessions.length) {
      setSelectedIndex(0);
    }
  }, [filteredSessions.length, selectedIndex]);

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
      void onRefreshExternalSessions?.();
      return;
    }
    const typedKey = key.sequence ?? (key.name === KEY_NAME.SPACE ? " " : key.name);
    if (!key.ctrl && !key.meta && typedKey && typedKey.length === 1) {
      setQuery((current) => current + typedKey);
    }
  });

  if (!isOpen) return null;

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
          Sessions (Ctrl+S to close)
        </text>
        <text attributes={TextAttributes.DIM}>
          {filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}
        </text>
      </box>
      <text attributes={TextAttributes.DIM}>Filter: {query.length > 0 ? query : "(none)"}</text>
      {externalSessionLoading ? (
        <text attributes={TextAttributes.DIM}>Loading native Cursor sessions…</text>
      ) : null}
      {externalSessionError ? (
        <text fg={COLOR.YELLOW}>{toExternalSessionErrorLabel(externalSessionError)}</text>
      ) : null}
      {filteredSessions.length === 0 ? (
        <text attributes={TextAttributes.DIM}>No sessions available</text>
      ) : (
        <select
          options={options}
          selectedIndex={selectedIndex}
          focused={true}
          onChange={(index) => setSelectedIndex(index)}
          onSelect={(index, option) => {
            if (!option?.value) return;
            const parsed = SessionIdSchema.safeParse(option.value);
            if (!parsed.success) return;
            const selectedSession = filteredSessions[index];
            onSelectSession(parsed.data, selectedSession?.switchSeed);
            onClose();
          }}
          style={UI.FULL_WIDTH_STYLE}
        />
      )}
      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>
          ↑/↓: Navigate | Enter: Select | Type to filter | Esc/Ctrl+S: Close
          {onRefreshExternalSessions ? " | Ctrl+R: Refresh native" : ""}
        </text>
      </box>
    </box>
  );
}
