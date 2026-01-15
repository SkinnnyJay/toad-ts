import { useAppStore } from "@/store/app-store";
import { Box, Text } from "ink";

export function StatusLine(): JSX.Element {
  const status = useAppStore((state) => state.connectionStatus);
  const sessionId = useAppStore((state) => state.currentSessionId);

  return (
    <Box flexDirection="row" gap={2}>
      <Text color="yellow">Status: {status}</Text>
      <Text dimColor>{sessionId ? `Session ${sessionId}` : "No session"}</Text>
    </Box>
  );
}
