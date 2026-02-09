import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import type { CommandDefinition } from "@/constants/command-definitions";
import { COMMAND_DEFINITIONS } from "@/constants/command-definitions";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENV_KEY } from "@/constants/env-keys";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { PERMISSION_PATTERN } from "@/constants/permission-patterns";
import { PERMISSION } from "@/constants/permissions";
import { PLAN_STATUS } from "@/constants/plan-status";
import { SESSION_MODE } from "@/constants/session-modes";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import { useAppStore } from "@/store/app-store";
import type { AgentId, Message, SessionId } from "@/types/domain";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import { CommandPalette } from "@/ui/components/CommandPalette";
import { InputWithAutocomplete } from "@/ui/components/InputWithAutocomplete";
import { MessageList } from "@/ui/components/MessageList";
import { PlanApprovalPanel } from "@/ui/components/PlanApprovalPanel";
import { PlanPanel } from "@/ui/components/PlanPanel";
import { ToolCallManager } from "@/ui/components/ToolCallManager";
import { TruncationProvider } from "@/ui/components/TruncationProvider";
import { roleColor } from "@/ui/theme";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { getRepoInfo } from "@/utils/git/git-info.utils";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, memo, useCallback, useMemo, useState } from "react";
import { useMessageSender } from "./MessageSender";
import { useSlashCommandHandler } from "./SlashCommandHandler";

export interface ChatProps {
  sessionId?: SessionId;
  agent?: { id: AgentId; name: string; description?: string };
  client?: HarnessRuntime | null;
  onPromptComplete?: (sessionId: SessionId) => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  focusTarget?: FocusTarget;
}

export const Chat = memo(
  ({
    sessionId,
    agent,
    client,
    onPromptComplete,
    onOpenSettings,
    onOpenHelp,
    focusTarget = FOCUS_TARGET.CHAT,
  }: ChatProps): ReactNode => {
    const appendMessage = useAppStore((state) => state.appendMessage);
    const messages = useAppStore((state) =>
      sessionId ? state.getMessagesForSession(sessionId) : []
    );
    const currentSession = useAppStore((state) =>
      sessionId ? state.getSession(sessionId) : undefined
    );
    const connectionStatus = useAppStore((state) => state.connectionStatus);
    const upsertPlan = useAppStore((state) => state.upsertPlan);
    const getPlanBySession = useAppStore((state) => state.getPlanBySession);

    const [inputValue, setInputValue] = useState("");
    const [isPaletteOpen, setPaletteOpen] = useState(false);

    const effectiveSessionId = useMemo(() => {
      if (sessionId) return sessionId;
      return SessionIdSchema.parse("session-unknown");
    }, [sessionId]);

    const env = useMemo(() => new Env(EnvManager.getInstance()), []);
    const repoInfo = useMemo(() => {
      // Read format from environment variable, default to "full"
      const formatEnv = env.getString(ENV_KEY.TOADSTOOL_UI_PROJECT_FOLDER_PATH_RENDER);
      const format = formatEnv === "short" ? "short" : "full";
      const info = getRepoInfo(process.cwd(), format);
      const colonIndex = info.lastIndexOf(":");
      if (colonIndex === -1) {
        return { path: info, branch: "" };
      }
      return {
        path: info.slice(0, colonIndex),
        branch: info.slice(colonIndex + 1),
      };
    }, [env]);

    useKeyboard((key) => {
      if (key.ctrl && key.name === "p") {
        key.preventDefault();
        key.stopPropagation();
        setPaletteOpen((prev) => !prev);
      }
      if (isPaletteOpen && key.name === "escape") {
        key.preventDefault();
        key.stopPropagation();
        setPaletteOpen(false);
      }
    });

    const sessionMode = currentSession?.mode ?? SESSION_MODE.AUTO;
    const plan = sessionId ? getPlanBySession(sessionId) : undefined;

    const appendSystemMessage = useCallback(
      (text: string): void => {
        const now = Date.now();
        const message: Message = {
          id: MessageIdSchema.parse(`sys-${now}`),
          sessionId: effectiveSessionId,
          role: MESSAGE_ROLE.SYSTEM,
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
          createdAt: now,
          isStreaming: false,
        };
        appendMessage(message);
      },
      [appendMessage, effectiveSessionId]
    );

    const handleSlashCommand = useSlashCommandHandler({
      sessionId,
      appendSystemMessage,
      onOpenSettings,
      onOpenHelp,
    });

    const { handleSubmit, modeWarning } = useMessageSender({
      sessionMode,
      sessionId,
      effectiveSessionId,
      client,
      appendMessage,
      onPromptComplete,
      handleSlashCommand,
      onResetInput: () => setInputValue(""),
    });

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
        <box flexDirection="column" height="100%">
          {/* Fixed header section */}
          <box flexDirection="column" flexShrink={0}>
            <box flexDirection="row" alignItems="center" gap={1}>
              {/* <AppIcon size="small" /> */}
              <text>
                {repoInfo.path}
                {repoInfo.branch ? (
                  <>
                    :<span fg={COLOR.CYAN}>{repoInfo.branch}</span>
                  </>
                ) : null}{" "}
                · Session: {effectiveSessionId} {agent ? `· Agent: ${agent.name}` : ""} · Mode:{" "}
                {sessionMode} · Status:{" "}
                <span
                  fg={
                    connectionStatus === CONNECTION_STATUS.CONNECTED
                      ? roleColor(MESSAGE_ROLE.ASSISTANT)
                      : COLOR.YELLOW
                  }
                >
                  {connectionStatus}
                </span>
              </text>
            </box>
            {modeWarning ? <text fg={COLOR.YELLOW}>{modeWarning}</text> : null}
            {plan ? (
              plan.status === PLAN_STATUS.PLANNING ? (
                <PlanApprovalPanel
                  plan={plan}
                  onApprove={() => {
                    const updatedPlan = {
                      ...plan,
                      status: PLAN_STATUS.EXECUTING,
                      updatedAt: Date.now(),
                    };
                    upsertPlan(updatedPlan);
                  }}
                  onDeny={() => {
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
                [PERMISSION_PATTERN.READ]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.LIST]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.SEARCH]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.FETCH]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.WRITE]:
                  sessionMode === SESSION_MODE.FULL_ACCESS ? PERMISSION.ALLOW : PERMISSION.ASK,
                [PERMISSION_PATTERN.EDIT]:
                  sessionMode === SESSION_MODE.FULL_ACCESS ? PERMISSION.ALLOW : PERMISSION.ASK,
                [PERMISSION_PATTERN.DELETE]: PERMISSION.DENY,
                [PERMISSION_PATTERN.EXEC]:
                  sessionMode === SESSION_MODE.FULL_ACCESS ? PERMISSION.ALLOW : PERMISSION.ASK,
                [PERMISSION_PATTERN.TODO]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.ASK]: PERMISSION.ASK,
              }}
            />
          </box>
          {/* Message area - fixed height container */}
          <box flexGrow={1} minHeight={0} overflow="hidden" height="100%">
            <MessageList messages={messages} isFocused={focusTarget === FOCUS_TARGET.CHAT} />
          </box>
          {/* Fixed footer section - input pinned to bottom */}
          <box flexDirection="column" flexShrink={0}>
            <CommandPalette
              commands={COMMAND_DEFINITIONS}
              isOpen={isPaletteOpen}
              onClose={() => setPaletteOpen(false)}
              onSelect={handleCommandSelect}
            />
            <InputWithAutocomplete
              value={inputValue}
              onSubmit={handleSubmit}
              onChange={setInputValue}
              multiline
              focusTarget={focusTarget}
              slashCommands={COMMAND_DEFINITIONS}
              placeholder="Type a message or / for commands…"
            />
          </box>
        </box>
      </TruncationProvider>
    );
  }
);

Chat.displayName = "Chat";
