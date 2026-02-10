import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { useAppStore } from "@/store/app-store";
import { type SessionId, SessionIdSchema } from "@/types/domain";
import type { SelectOption } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

interface SessionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: SessionId) => void;
}

export function SessionsPopup({ isOpen, onClose, onSelectSession }: SessionsPopupProps): ReactNode {
  const sessions = useAppStore((state) => Object.values(state.sessions));
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState("");

  // Sort sessions by updatedAt descending
  const sortedSessions = useMemo(() => {
    return [...sessions]
      .filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (!query.trim()) {
      return sortedSessions;
    }
    const normalized = query.trim().toLowerCase();
    return sortedSessions.filter((session) => {
      const title = session.title ?? "";
      const agentId = session.agentId ?? "";
      return (
        session.id.toLowerCase().includes(normalized) ||
        title.toLowerCase().includes(normalized) ||
        agentId.toLowerCase().includes(normalized)
      );
    });
  }, [query, sortedSessions]);

  const options = useMemo<SelectOption[]>(() => {
    return filteredSessions.map((session) => {
      const sessionTitle = session.title || session.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH);
      const createdAt = new Date(session.createdAt).toLocaleString();
      const updatedAt = new Date(session.updatedAt).toLocaleString();
      const agentLabel = session.agentId?.slice(0, LIMIT.ID_TRUNCATE_LENGTH) || "N/A";
      return {
        name: sessionTitle,
        description: `Agent: ${agentLabel} · Created: ${createdAt} · Updated: ${updatedAt}`,
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
    if (key.name === "escape" || (key.ctrl && key.name === "s")) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
      return;
    }
    if (key.name === "backspace") {
      key.preventDefault();
      key.stopPropagation();
      setQuery((current) => current.slice(0, -1));
      return;
    }
    if (!key.ctrl && !key.meta && key.sequence && key.sequence.length === 1) {
      setQuery((current) => current + key.sequence);
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
      {filteredSessions.length === 0 ? (
        <text attributes={TextAttributes.DIM}>No sessions available</text>
      ) : (
        <select
          options={options}
          selectedIndex={selectedIndex}
          focused={true}
          onChange={(index) => setSelectedIndex(index)}
          onSelect={(_index, option) => {
            if (!option?.value) return;
            const parsed = SessionIdSchema.safeParse(option.value);
            if (!parsed.success) return;
            onSelectSession(parsed.data);
            onClose();
          }}
          style={{ width: "100%" }}
        />
      )}
      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>
          ↑/↓: Navigate | Enter: Select | Type to filter | Esc/Ctrl+S: Close
        </text>
      </box>
    </box>
  );
}
