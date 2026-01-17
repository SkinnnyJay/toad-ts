import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import type { CommandDefinition } from "@/constants/command-definitions";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { PERMISSION_PATTERN } from "@/constants/permission-patterns";
import { PERMISSION } from "@/constants/permissions";
import { PLAN_STATUS } from "@/constants/plan-status";
import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND } from "@/constants/slash-commands";
import { TASK_STATUS } from "@/constants/task-status";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { useAppStore } from "@/store/app-store";
import type { AgentId, Message, Plan, Session, SessionId } from "@/types/domain";
import {
  MessageIdSchema,
  PlanIdSchema,
  SessionIdSchema,
  SessionModeSchema,
  TaskIdSchema,
} from "@/types/domain";
// import { AppIcon } from "@/ui/components/AppIcon";
import { InputWithAutocomplete } from "@/ui/components/InputWithAutocomplete";
import { MessageList } from "@/ui/components/MessageList";
import { PlanApprovalPanel } from "@/ui/components/PlanApprovalPanel";
import { PlanPanel } from "@/ui/components/PlanPanel";
import { ToolCallManager } from "@/ui/components/ToolCallManager";
import { roleColor } from "@/ui/theme";
import { getRepoInfo } from "@/utils/git/git-info.utils";
import { Box, Text, useInput } from "ink";
import { nanoid } from "nanoid";
import { memo, useCallback, useMemo, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { TruncationProvider } from "./TruncationProvider";

interface ChatProps {
  sessionId?: SessionId;
  agent?: { id: AgentId; name: string; description?: string };
  client?: HarnessRuntime | null;
  onPromptComplete?: (sessionId: SessionId) => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  focusTarget?: "files" | "plan" | "context" | "sessions" | "agent" | "chat";
}

export const runSlashCommand = (
  value: string,
  deps: {
    sessionId?: SessionId;
    appendSystemMessage: (text: string) => void;
    getSession: (sessionId: SessionId) => Session | undefined;
    upsertSession: (params: { session: Session }) => void;
    clearMessagesForSession: (sessionId: SessionId) => void;
    upsertPlan: (plan: Plan) => void;
    now?: () => number;
  }
): boolean => {
  if (!value.startsWith("/")) return false;
  const parts = value.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();
  if (!deps.sessionId) {
    deps.appendSystemMessage("No active session for slash command.");
    return true;
  }

  switch (command) {
    case SLASH_COMMAND.HELP: {
      deps.appendSystemMessage(
        "Commands: /help, /mode <read-only|auto|full-access>, /clear, /plan <title>"
      );
      return true;
    }
    case SLASH_COMMAND.MODE: {
      const nextMode = parts[1];
      const parsed = SessionModeSchema.safeParse(nextMode);
      if (!parsed.success) {
        deps.appendSystemMessage("Invalid mode. Use read-only, auto, or full-access.");
        return true;
      }
      const session = deps.getSession(deps.sessionId);
      if (!session) {
        deps.appendSystemMessage("No session to update mode.");
        return true;
      }
      deps.upsertSession({ session: { ...session, mode: parsed.data } });
      deps.appendSystemMessage(`Mode updated to ${parsed.data}.`);
      return true;
    }
    case SLASH_COMMAND.CLEAR: {
      deps.clearMessagesForSession(deps.sessionId);
      deps.appendSystemMessage("Session messages cleared.");
      return true;
    }
    case SLASH_COMMAND.PLAN: {
      const title = parts.slice(1).join(" ").trim() || "Plan";
      const now = deps.now?.() ?? Date.now();
      const planId = PlanIdSchema.parse(`plan-${nanoid(6)}`);
      const planPayload: Plan = {
        id: planId,
        sessionId: deps.sessionId,
        originalPrompt: title,
        tasks: [
          {
            id: TaskIdSchema.parse(`task-${nanoid(LIMIT.NANOID_LENGTH)}`),
            planId,
            title,
            description: title,
            status: TASK_STATUS.PENDING,
            dependencies: [],
            result: undefined,
            createdAt: now,
          },
        ],
        status: PLAN_STATUS.PLANNING,
        createdAt: now,
        updatedAt: now,
      };
      deps.upsertPlan(planPayload);
      deps.appendSystemMessage(`Plan created: ${title}`);
      return true;
    }
    default: {
      deps.appendSystemMessage(`Unknown command: ${command}`);
      return true;
    }
  }
};

export const Chat = memo(
  ({
    sessionId,
    agent,
    client,
    onPromptComplete,
    onOpenSettings,
    onOpenHelp,
    focusTarget = "chat",
  }: ChatProps): JSX.Element => {
    const appendMessage = useAppStore((state) => state.appendMessage);
    const messages = useAppStore((state) =>
      sessionId ? state.getMessagesForSession(sessionId) : []
    );
    const currentSession = useAppStore((state) =>
      sessionId ? state.getSession(sessionId) : undefined
    );
    const connectionStatus = useAppStore((state) => state.connectionStatus);
    const upsertSession = useAppStore((state) => state.upsertSession);
    const clearMessagesForSession = useAppStore((state) => state.clearMessagesForSession);
    const upsertPlan = useAppStore((state) => state.upsertPlan);
    const getPlanBySession = useAppStore((state) => state.getPlanBySession);

    const [inputValue, setInputValue] = useState("");
    const [modeWarning, setModeWarning] = useState<string | null>(null);
    const [isPaletteOpen, setPaletteOpen] = useState(false);

    const commandList = useMemo(
      () => [
        { name: SLASH_COMMAND.HELP, description: "Show available commands" },
        {
          name: SLASH_COMMAND.MODE,
          description: "Change session mode",
          args: `<${SESSION_MODE.READ_ONLY}|${SESSION_MODE.AUTO}|${SESSION_MODE.FULL_ACCESS}>`,
        },
        { name: SLASH_COMMAND.CLEAR, description: "Clear chat messages" },
        { name: SLASH_COMMAND.PLAN, description: "Create a new plan", args: "<title>" },
        { name: SLASH_COMMAND.SETTINGS, description: "Open settings" },
        { name: SLASH_COMMAND.EXPORT, description: "Export session", args: "<filename>" },
      ],
      []
    );

    const effectiveSessionId = useMemo(() => {
      if (sessionId) return sessionId;
      return SessionIdSchema.parse("session-unknown");
    }, [sessionId]);

    const repoInfo = useMemo(() => {
      const info = getRepoInfo();
      const colonIndex = info.lastIndexOf(":");
      if (colonIndex === -1) {
        return { path: info, branch: "" };
      }
      return {
        path: info.slice(0, colonIndex),
        branch: info.slice(colonIndex + 1),
      };
    }, []);

    useInput((input, key) => {
      if (key.ctrl && (input === "p" || input === "P")) {
        setPaletteOpen((prev) => !prev);
      }
      if (isPaletteOpen && key.escape) {
        setPaletteOpen(false);
      }
    });

    const sessionMode = currentSession?.mode ?? "auto";
    const plan = sessionId ? getPlanBySession(sessionId) : undefined;

    const appendSystemMessage = useCallback(
      (text: string): void => {
        const now = Date.now();
        appendMessage({
          id: MessageIdSchema.parse(`sys-${now}`),
          sessionId: effectiveSessionId,
          role: "system",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
          createdAt: now,
          isStreaming: false,
        });
      },
      [appendMessage, effectiveSessionId]
    );

    const handleSlashCommand = useCallback(
      (value: string): boolean => {
        if (!value.startsWith("/")) return false;
        const parts = value.trim().split(/\s+/);
        const command = parts[0]?.toLowerCase();
        if (!sessionId) {
          appendSystemMessage("No active session for slash command.");
          return true;
        }

        switch (command) {
          case SLASH_COMMAND.HELP: {
            onOpenHelp?.();
            return true;
          }
          case SLASH_COMMAND.SETTINGS: {
            onOpenSettings?.();
            return true;
          }
          case SLASH_COMMAND.MODE: {
            const nextMode = parts[1];
            const parsed = SessionModeSchema.safeParse(nextMode);
            if (!parsed.success) {
              appendSystemMessage("Invalid mode. Use read-only, auto, or full-access.");
              return true;
            }
            const session = useAppStore.getState().getSession(sessionId);
            if (!session) {
              appendSystemMessage("No session to update mode.");
              return true;
            }
            upsertSession({ session: { ...session, mode: parsed.data } });
            appendSystemMessage(`Mode updated to ${parsed.data}.`);
            return true;
          }
          case SLASH_COMMAND.CLEAR: {
            clearMessagesForSession(sessionId);
            appendSystemMessage("Session messages cleared.");
            return true;
          }
          case SLASH_COMMAND.PLAN: {
            const title = parts.slice(1).join(" ").trim() || "Plan";
            const now = Date.now();
            const planId = PlanIdSchema.parse(`plan-${nanoid(LIMIT.NANOID_LENGTH)}`);
            const planPayload: Plan = {
              id: planId,
              sessionId,
              originalPrompt: title,
              tasks: [
                {
                  id: TaskIdSchema.parse(`task-${nanoid(LIMIT.NANOID_LENGTH)}`),
                  planId,
                  title,
                  description: title,
                  status: TASK_STATUS.PENDING,
                  dependencies: [],
                  result: undefined,
                  createdAt: now,
                },
              ],
              status: PLAN_STATUS.PLANNING,
              createdAt: now,
              updatedAt: now,
            };
            upsertPlan(planPayload);
            appendSystemMessage(`Plan created: ${title}`);
            return true;
          }
          default: {
            appendSystemMessage(`Unknown command: ${command}`);
            return true;
          }
        }
      },
      [
        sessionId,
        appendSystemMessage,
        upsertSession,
        clearMessagesForSession,
        upsertPlan,
        onOpenSettings,
        onOpenHelp,
      ]
    );

    const handleSubmit = useCallback(
      (value: string): void => {
        if (!value.trim()) return;
        if (handleSlashCommand(value)) {
          setInputValue("");
          return;
        }
        if (sessionMode === SESSION_MODE.READ_ONLY) {
          setModeWarning("Session is read-only; prompts are blocked.");
          return;
        }
        setModeWarning(null);

        const now = Date.now();
        const userMessage: Message = {
          id: MessageIdSchema.parse(`msg-${now}`),
          sessionId: effectiveSessionId,
          role: "user",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: value }],
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
      },
      [
        handleSlashCommand,
        sessionMode,
        effectiveSessionId,
        appendMessage,
        client,
        sessionId,
        onPromptComplete,
      ]
    );

    const handleCommandSelect = useCallback(
      (cmd: CommandDefinition) => {
        const next = `${cmd.name}${cmd.args ? " " : ""}`;
        const handled = handleSlashCommand(next);
        if (!handled) {
          setInputValue(next);
        } else {
          setInputValue("");
        }
        setPaletteOpen(false);
      },
      [handleSlashCommand]
    );

    return (
      <TruncationProvider>
        <Box flexDirection="column" height="100%">
          {/* Fixed header section */}
          <Box flexDirection="column" flexShrink={0}>
            <Box flexDirection="row" alignItems="center" gap={1}>
              {/* <AppIcon size="small" /> */}
              <Text>
                {repoInfo.path}
                {repoInfo.branch ? (
                  <>
                    :<Text color={COLOR.CYAN}>{repoInfo.branch}</Text>
                  </>
                ) : null}{" "}
                · Session: {effectiveSessionId} {agent ? `· Agent: ${agent.name}` : ""} · Mode:{" "}
                {sessionMode} · Status:{" "}
                <Text
                  color={
                    connectionStatus === CONNECTION_STATUS.CONNECTED
                      ? roleColor("assistant")
                      : COLOR.YELLOW
                  }
                >
                  {connectionStatus}
                </Text>
              </Text>
            </Box>
            {modeWarning ? <Text color={COLOR.YELLOW}>{modeWarning}</Text> : null}
            {plan ? (
              plan.status === PLAN_STATUS.PLANNING ? (
                <PlanApprovalPanel
                  plan={plan}
                  onApprove={() => {
                    // Update plan status to executing
                    const updatedPlan = {
                      ...plan,
                      status: PLAN_STATUS.EXECUTING,
                      updatedAt: Date.now(),
                    };
                    upsertPlan(updatedPlan);
                  }}
                  onDeny={() => {
                    // Update plan status to failed
                    const updatedPlan = {
                      ...plan,
                      status: PLAN_STATUS.FAILED,
                      updatedAt: Date.now(),
                    };
                    upsertPlan(updatedPlan);
                  }}
                  autoApprove={sessionMode === SESSION_MODE.FULL_ACCESS}
                  showTaskDetails={true}
                />
              ) : (
                <PlanPanel plan={plan} />
              )
            ) : null}
            <ToolCallManager
              defaultPermission={
                sessionMode === SESSION_MODE.FULL_ACCESS
                  ? PERMISSION.ALLOW
                  : sessionMode === SESSION_MODE.READ_ONLY
                    ? PERMISSION.DENY
                    : PERMISSION.ASK
              }
              autoApproveTimeout={
                sessionMode === SESSION_MODE.FULL_ACCESS
                  ? TIMEOUT.AUTO_APPROVE_DISABLED
                  : TIMEOUT.AUTO_APPROVE_DEFAULT
              }
              permissionProfiles={{
                [PERMISSION_PATTERN.READ_FILE]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.LIST]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.GET]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.WRITE]:
                  sessionMode === SESSION_MODE.FULL_ACCESS ? PERMISSION.ALLOW : PERMISSION.ASK,
                [PERMISSION_PATTERN.DELETE]: PERMISSION.DENY,
                [PERMISSION_PATTERN.EXEC]:
                  sessionMode === SESSION_MODE.FULL_ACCESS ? PERMISSION.ALLOW : PERMISSION.ASK,
              }}
            />
          </Box>
          {/* Message area - fixed height container */}
          <Box flexGrow={1} minHeight={0} overflow="hidden" height="100%">
            <MessageList messages={messages} />
          </Box>
          {/* Fixed footer section - input pinned to bottom */}
          <Box flexDirection="column" flexShrink={0}>
            <CommandPalette
              commands={commandList}
              isOpen={isPaletteOpen}
              onClose={() => setPaletteOpen(false)}
              onSelect={handleCommandSelect}
            />
            <InputWithAutocomplete
              value={inputValue}
              onSubmit={handleSubmit}
              onChange={setInputValue}
              multiline
              slashCommands={commandList}
              focusTarget={focusTarget}
            />
          </Box>
        </Box>
      </TruncationProvider>
    );
  }
);

Chat.displayName = "Chat";
