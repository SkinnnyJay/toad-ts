import { COLOR } from "@/constants/colors";
import { SESSION_MODE } from "@/constants/session-modes";
import { useAppStore } from "@/store/app-store";
import { Box, Text } from "ink";

export function StatusLine(): JSX.Element {
  const status = useAppStore((state) => state.connectionStatus);
  const sessionId = useAppStore((state) => state.currentSessionId);
  const currentSession = useAppStore((state) =>
    sessionId ? state.getSession(sessionId) : undefined
  );
  const mode = currentSession?.mode ?? SESSION_MODE.AUTO;

  return (
    <Box flexDirection="row" gap={2}>
      <Text color={COLOR.YELLOW}>Status: {status}</Text>
      <Text dimColor>{sessionId ? `Session ${sessionId}` : "No session"}</Text>
      <Text dimColor>Mode: {mode}</Text>
    </Box>
  );
}
