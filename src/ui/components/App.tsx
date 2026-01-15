import { ACPClient } from "@/core/acp-client";
import { ACPConnection } from "@/core/acp-connection";
import { SessionStream } from "@/core/session-stream";
import { useAppStore } from "@/store/app-store";
import type { AgentId, SessionId } from "@/types/domain";
import { AgentIdSchema, SessionIdSchema } from "@/types/domain";
import { AgentSelect } from "@/ui/components/AgentSelect";
import { Chat } from "@/ui/components/Chat";
import { StatusLine } from "@/ui/components/StatusLine";
import { Box, Text } from "ink";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AgentInfo {
  id: AgentId;
  name: string;
  description?: string;
  command?: string;
  args?: string[];
}

type View = "agent-select" | "chat";

const DEFAULT_AGENTS: AgentInfo[] = [
  {
    id: AgentIdSchema.parse("claude-cli"),
    name: "Claude CLI",
    description: "Anthropic CLI (ACP)",
    command: "claude",
    args: ["--experimental-acp"],
  },
  { id: AgentIdSchema.parse("dev-null"), name: "Dev Null", description: "Stub agent" },
];

export function App(): JSX.Element {
  const [view, setView] = useState<View>("agent-select");
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [client, setClient] = useState<ACPClient | null>(null);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const upsertSession = useAppStore((state) => state.upsertSession);

  const [sessionId, setSessionId] = useState<SessionId | undefined>(currentSessionId);
  const sessionStream = useMemo(() => new SessionStream(useAppStore.getState()), []);

  const handlePromptComplete = useCallback(
    (id: SessionId) => {
      sessionStream.finalizeSession(id);
    },
    [sessionStream]
  );

  useEffect(() => {
    if (currentSessionId) {
      setSessionId(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (!selectedAgent || selectedAgent.command) {
      return;
    }

    if (sessionId) {
      setCurrentSession(sessionId);
      setConnectionStatus("connected");
      setView("chat");
      return;
    }

    const localSessionId = SessionIdSchema.parse(nanoid());
    setSessionId(localSessionId);
    upsertSession({
      session: {
        id: localSessionId,
        title: selectedAgent.name,
        agentId: selectedAgent.id,
        messageIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
    setCurrentSession(localSessionId);
    setConnectionStatus("connected");
    setView("chat");
  }, [selectedAgent, sessionId, setConnectionStatus, setCurrentSession, upsertSession]);

  useEffect(() => {
    if (!selectedAgent?.command) {
      setClient(null);
      return;
    }

    let active = true;
    setSessionId(undefined);

    const connection = new ACPConnection({
      command: selectedAgent.command,
      args: selectedAgent.args,
      cwd: process.cwd(),
    });
    const acpClient = new ACPClient(connection);
    const detach = sessionStream.attach(acpClient);

    acpClient.on("state", (status) => setConnectionStatus(status));
    acpClient.on("error", () => setConnectionStatus("error"));

    void (async () => {
      try {
        await acpClient.connect();
        await acpClient.initialize();
        const session = await acpClient.newSession({ cwd: process.cwd(), mcpServers: [] });
        if (!active) {
          return;
        }
        const newSessionId = SessionIdSchema.parse(session.sessionId);
        setSessionId(newSessionId);
        upsertSession({
          session: {
            id: newSessionId,
            title: selectedAgent.name,
            agentId: selectedAgent.id,
            messageIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
        setCurrentSession(newSessionId);
        setClient(acpClient);
        setView("chat");
      } catch (_error) {
        if (active) {
          setConnectionStatus("error");
        }
      }
    })();

    return () => {
      active = false;
      detach();
      void acpClient.disconnect();
      setClient(null);
    };
  }, [selectedAgent, sessionStream, setConnectionStatus, setCurrentSession, upsertSession]);

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Text bold>TOAD-TS</Text>
      {view === "agent-select" ? (
        <AgentSelect
          agents={DEFAULT_AGENTS}
          onSelect={(agent: AgentInfo) => setSelectedAgent(agent)}
        />
      ) : (
        <Chat
          sessionId={sessionId}
          agent={selectedAgent ?? undefined}
          client={client}
          onPromptComplete={handlePromptComplete}
        />
      )}
      <StatusLine />
    </Box>
  );
}
