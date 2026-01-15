import type { ACPClient } from "@/core/acp-client";
import { useAppStore } from "@/store/app-store";
import type { AgentId, Message, SessionId } from "@/types/domain";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import { Input } from "@/ui/components/Input";
import { MessageList } from "@/ui/components/MessageList";
import { Box, Text } from "ink";
import { useMemo, useState } from "react";

interface ChatProps {
  sessionId?: SessionId;
  agent?: { id: AgentId; name: string; description?: string };
  client?: ACPClient | null;
  onPromptComplete?: (sessionId: SessionId) => void;
}

export function Chat({ sessionId, agent, client, onPromptComplete }: ChatProps): JSX.Element {
  const appendMessage = useAppStore((state) => state.appendMessage);
  const messages = useAppStore((state) =>
    sessionId ? state.getMessagesForSession(sessionId) : []
  );

  const [inputValue, setInputValue] = useState("");

  const effectiveSessionId = useMemo(() => {
    if (sessionId) return sessionId;
    return SessionIdSchema.parse("session-unknown");
  }, [sessionId]);

  const handleSubmit = (value: string): void => {
    if (!value.trim()) return;
    const now = Date.now();
    const userMessage: Message = {
      id: MessageIdSchema.parse(`msg-${now}`),
      sessionId: effectiveSessionId,
      role: "user",
      content: [{ type: "text", text: value }],
      createdAt: now,
      isStreaming: false,
    };
    appendMessage(userMessage);
    setInputValue("");

    if (!client || !sessionId) {
      return;
    }

    void client
      .prompt({
        sessionId,
        prompt: [{ type: "text", text: value }],
      })
      .then(() => {
        onPromptComplete?.(sessionId);
      });
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>
        Session: {effectiveSessionId} {agent ? `· Agent: ${agent.name}` : ""}
      </Text>
      <MessageList messages={messages} />
      <Input value={inputValue} onSubmit={handleSubmit} onChange={setInputValue} />
    </Box>
  );
}
