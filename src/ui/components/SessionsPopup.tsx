import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { Box, Text, useInput } from "ink";
import { useMemo, useState } from "react";

interface SessionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: SessionId) => void;
}

export function SessionsPopup({
  isOpen,
  onClose,
  onSelectSession,
}: SessionsPopupProps): JSX.Element | null {
  const sessions = useAppStore((state) => Object.values(state.sessions));
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort sessions by updatedAt descending
  const sortedSessions = useMemo(() => {
    return [...sessions]
      .filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  useInput((input, key) => {
    if (!isOpen) return;

    if (key.escape || (key.ctrl && input === "s")) {
      onClose();
      return;
    }

    if (sortedSessions.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : sortedSessions.length - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < sortedSessions.length - 1 ? prev + 1 : 0));
      return;
    }

    if (key.return) {
      const selected = sortedSessions[selectedIndex];
      if (selected) {
        onSelectSession(selected.id);
        onClose();
      }
      return;
    }
  });

  if (!isOpen) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingX={1}
      paddingY={1}
      minHeight={20}
      width="80%"
    >
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text bold color={COLOR.CYAN}>
          Sessions (Ctrl+S to close)
        </Text>
        <Text dimColor>
          {sortedSessions.length} session{sortedSessions.length !== 1 ? "s" : ""}
        </Text>
      </Box>
      {sortedSessions.length === 0 ? (
        <Text dimColor>No sessions available</Text>
      ) : (
        <Box flexDirection="column" gap={0}>
          {sortedSessions.map((session, i) => {
            const isSelected = i === selectedIndex;
            const isCurrent = session.id === currentSessionId;
            const sessionTitle = session.title || session.id.slice(0, LIMIT.ID_TRUNCATE_LENGTH);
            const createdAt = new Date(session.createdAt).toLocaleString();
            const updatedAt = new Date(session.updatedAt).toLocaleString();

            return (
              <Box key={session.id} flexDirection="column" paddingX={1} paddingY={0}>
                <Text color={isCurrent ? COLOR.CYAN : isSelected ? COLOR.WHITE : undefined}>
                  {isSelected ? "› " : "  "}
                  {isCurrent ? "● " : "  "}
                  {sessionTitle}
                </Text>
                <Text dimColor>
                  {"  "}Agent: {session.agentId?.slice(0, LIMIT.ID_TRUNCATE_LENGTH) || "N/A"} |
                  Created: {createdAt} | Updated: {updatedAt}
                </Text>
                <Text dimColor>
                  {"  "}Messages: {session.messageIds.length} | Mode: {session.mode}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
      <Box marginTop={1} paddingTop={1} borderStyle="single" borderTop={true}>
        <Text dimColor>↑/↓: Navigate | Enter: Select | Esc/Ctrl+S: Close</Text>
      </Box>
    </Box>
  );
}
