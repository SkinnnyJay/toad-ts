import type { AgentInfo } from "@/agents/agent-manager";
import type { SubAgentRunner } from "@/agents/subagent-runner";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS, type CommandDefinition } from "@/constants/command-definitions";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENV_KEY } from "@/constants/env-keys";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { FORMAT_MODE } from "@/constants/format-modes";
import { KEY_NAME } from "@/constants/key-names";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { PERMISSION_PATTERN } from "@/constants/permission-patterns";
import { PERMISSION } from "@/constants/permissions";
import { PLAN_STATUS } from "@/constants/plan-status";
import { getRepoWorkflowSkillPrompt } from "@/constants/repo-workflow-skill-prompts";
import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import type { HarnessRuntime } from "@/harness/harnessAdapter";
import type { HarnessConfig } from "@/harness/harnessConfig";
import { useAppStore } from "@/store/app-store";
import type { CheckpointManager } from "@/store/checkpoints/checkpoint-manager";
import { runInteractiveShellCommand } from "@/tools/interactive-shell";
import { createToolRuntime } from "@/tools/runtime";
import { getShellCommandConfig, isShellCommandInput } from "@/tools/shell-command-config";
import type { Message, SessionId } from "@/types/domain";
import { MessageIdSchema, SessionIdSchema } from "@/types/domain";
import { CommandPalette } from "@/ui/components/CommandPalette";
import { InputWithAutocomplete } from "@/ui/components/InputWithAutocomplete";
import { MessageList } from "@/ui/components/MessageList";
import { PlanApprovalPanel } from "@/ui/components/PlanApprovalPanel";
import { PlanPanel } from "@/ui/components/PlanPanel";
import { ToolCallManager } from "@/ui/components/ToolCallManager";
import { TruncationProvider } from "@/ui/components/TruncationProvider";
import { useRotatingFact } from "@/ui/hooks/useRandomFact";
import { roleColor } from "@/ui/theme";
import { openExternalEditor } from "@/utils/editor/externalEditor";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { getRepoInfo } from "@/utils/git/git-info.utils";
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { type ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useMessageSender } from "./MessageSender";
import { useSlashCommandHandler } from "./SlashCommandHandler";

export interface ChatProps {
  sessionId?: SessionId;
  agent?: AgentInfo;
  agents?: AgentInfo[];
  client?: HarnessRuntime | null;
  /** Slash commands for palette and autocomplete; when omitted, uses all COMMAND_DEFINITIONS. */
  slashCommands?: CommandDefinition[];
  onPromptComplete?: (sessionId: SessionId) => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenSessions?: () => void;
  onOpenAgentSelect?: () => void;
  onOpenThemes?: () => void;
  onOpenContext?: () => void;
  onOpenHooks?: () => void;
  onOpenProgress?: () => void;
  onOpenAgents?: () => void;
  onOpenSkills?: () => void;
  onOpenCommands?: () => void;
  onToggleVimMode?: () => boolean;
  vimEnabled?: boolean;
  harnesses?: Record<string, HarnessConfig>;
  checkpointManager?: CheckpointManager;
  subAgentRunner?: SubAgentRunner;
  focusTarget?: FocusTarget;
  queuedBreadcrumbSkill?: string | null;
  onConsumeQueuedBreadcrumbSkill?: () => void;
  hideRepoInHeader?: boolean;
}

export const Chat = memo(
  ({
    sessionId,
    agent,
    agents = [],
    client,
    slashCommands = COMMAND_DEFINITIONS,
    onPromptComplete,
    onOpenSettings,
    onOpenHelp,
    onOpenSessions,
    onOpenAgentSelect,
    onOpenThemes,
    onOpenContext,
    onOpenHooks,
    onOpenProgress,
    onOpenAgents,
    onOpenSkills,
    onOpenCommands,
    onToggleVimMode,
    vimEnabled,
    harnesses,
    checkpointManager,
    subAgentRunner,
    focusTarget = FOCUS_TARGET.CHAT,
    queuedBreadcrumbSkill = null,
    onConsumeQueuedBreadcrumbSkill,
    hideRepoInHeader = false,
  }: ChatProps): ReactNode => {
    const appendMessage = useAppStore((state) => state.appendMessage);
    const setTodosForSession = useAppStore((state) => state.setTodosForSession);
    const loadedSkills = useAppStore((state) => state.loadedSkills);
    const messages = useAppStore((state) =>
      sessionId ? state.getMessagesForSession(sessionId) : []
    );
    const currentSession = useAppStore((state) =>
      sessionId ? state.getSession(sessionId) : undefined
    );
    const connectionStatus = useAppStore((state) => state.connectionStatus);
    const upsertPlan = useAppStore((state) => state.upsertPlan);
    const getPlanBySession = useAppStore((state) => state.getPlanBySession);
    const pendingFileRefForInput = useAppStore((state) => state.uiState.pendingFileRefForInput);
    const setPendingFileRefForInput = useAppStore((state) => state.setPendingFileRefForInput);

    const [inputValue, setInputValue] = useState("");
    const [isPaletteOpen, setPaletteOpen] = useState(false);
    const { fact: randomFact } = useRotatingFact(messages.length === 0);
    const factDisplayLine = useMemo(() => {
      if (!randomFact) return "";
      const line = `Fact: ${randomFact}`;
      const max = LIMIT.FACT_DISPLAY_MAX_LENGTH;
      return line.length > max ? `${line.slice(0, max - 1)}…` : line;
    }, [randomFact]);

    const effectiveSessionId = useMemo(() => {
      if (sessionId) return sessionId;
      return SessionIdSchema.parse("session-unknown");
    }, [sessionId]);

    const env = useMemo(() => new Env(EnvManager.getInstance()), []);
    const toolRuntime = useMemo(
      () =>
        createToolRuntime({
          baseDir: process.cwd(),
          env: EnvManager.getInstance().getSnapshot(),
          sessionId: sessionId ?? undefined,
          onTodosUpdated: (sid, items) =>
            useAppStore.getState().setTodosForSession(SessionIdSchema.parse(sid), items),
        }),
      [sessionId]
    );

    useEffect(() => {
      if (!sessionId) return;
      void toolRuntime.context.todoStore
        .list()
        .then((items) => setTodosForSession(sessionId, items));
    }, [sessionId, setTodosForSession, toolRuntime.context.todoStore]);

    useEffect(() => {
      if (pendingFileRefForInput == null) return;
      setInputValue((prev) => {
        const sep = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
        return prev + sep + pendingFileRefForInput;
      });
      setPendingFileRefForInput(null);
    }, [pendingFileRefForInput, setPendingFileRefForInput]);

    const shellCommandConfig = useMemo(() => getShellCommandConfig(env), [env]);
    const renderer = useRenderer();
    const runInteractiveShell = useCallback(
      (command: string, cwd?: string) => runInteractiveShellCommand({ command, cwd, renderer }),
      [renderer]
    );
    const repoInfo = useMemo(() => {
      // Read format from environment variable, default to "full"
      const formatEnv = env.getString(ENV_KEY.TOADSTOOL_UI_PROJECT_FOLDER_PATH_RENDER);
      const format = formatEnv === FORMAT_MODE.SHORT ? FORMAT_MODE.SHORT : FORMAT_MODE.FULL;
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
      if (key.ctrl && key.name === KEY_NAME.P) {
        key.preventDefault();
        key.stopPropagation();
        setPaletteOpen((prev) => !prev);
      }
      if (isPaletteOpen && key.name === KEY_NAME.ESCAPE) {
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

    const handleOpenEditor = useCallback(
      async (initialValue: string) => {
        const content = await openExternalEditor({
          initialValue,
          cwd: process.cwd(),
          renderer,
        });
        if (content === null) {
          appendSystemMessage(SLASH_COMMAND_MESSAGE.EDITOR_NOT_CONFIGURED);
          return;
        }
        const trimmed = content.trimEnd();
        if (!trimmed.trim()) {
          appendSystemMessage(SLASH_COMMAND_MESSAGE.EDITOR_EMPTY);
          return;
        }
        setInputValue(trimmed);
      },
      [appendSystemMessage, renderer]
    );

    const handleSlashCommand = useSlashCommandHandler({
      sessionId,
      appendSystemMessage,
      onOpenSettings,
      onOpenHelp,
      onOpenSessions,
      onOpenEditor: handleOpenEditor,
      onOpenAgentSelect,
      onOpenThemes,
      onOpenContext,
      onOpenHooks,
      onOpenProgress,
      onOpenAgents,
      onOpenSkills,
      onOpenCommands,
      onToggleVimMode,
      harnesses,
      client,
      agent,
      agents,
      subAgentRunner,
      checkpointManager,
    });

    const shellCompletion = useMemo(
      () => ({
        isShellInput: (value: string) => isShellCommandInput(value, shellCommandConfig),
        getCompletions: (prefix: string) => toolRuntime.context.shell.complete(prefix),
      }),
      [shellCommandConfig, toolRuntime]
    );

    const updateMessage = useAppStore((state) => state.updateMessage);
    const handlePromptStart = useCallback(
      (id: SessionId, prompt: string) => {
        checkpointManager?.startCheckpoint(id, prompt);
      },
      [checkpointManager]
    );
    const { handleSubmit, modeWarning } = useMessageSender({
      sessionMode,
      sessionId,
      effectiveSessionId,
      client,
      agents,
      currentAgent: agent,
      appendMessage,
      updateMessage,
      onPromptComplete,
      handleSlashCommand,
      onPromptStart: handlePromptStart,
      onResetInput: () => setInputValue(""),
      appendSystemMessage,
      toolRuntime,
      shellCommandConfig,
      runInteractiveShell,
      runSubAgent: subAgentRunner
        ? (targetAgent, prompt, parentSessionId) =>
            subAgentRunner.run({ agent: targetAgent, prompt, parentSessionId })
        : undefined,
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

    useEffect(() => {
      if (!queuedBreadcrumbSkill || !onConsumeQueuedBreadcrumbSkill) return;
      onConsumeQueuedBreadcrumbSkill();
      const skill = loadedSkills.find((s) => s.name === queuedBreadcrumbSkill);
      if (skill?.content?.trim()) {
        handleSubmit(skill.content.trim());
      } else {
        const fallbackPrompt = getRepoWorkflowSkillPrompt(queuedBreadcrumbSkill);
        if (fallbackPrompt) {
          appendSystemMessage(`Running workflow action: ${queuedBreadcrumbSkill}`);
          handleSubmit(fallbackPrompt);
          return;
        }
        appendSystemMessage(`Skill not found: ${queuedBreadcrumbSkill}`);
      }
    }, [
      queuedBreadcrumbSkill,
      onConsumeQueuedBreadcrumbSkill,
      loadedSkills,
      handleSubmit,
      appendSystemMessage,
    ]);

    return (
      <TruncationProvider>
        <box flexDirection="column" flexGrow={1} minHeight={0} width="100%" height="100%">
          {/* Fixed header section */}
          <box flexDirection="column" flexShrink={0}>
            <box flexDirection="row" alignItems="center" gap={1}>
              {hideRepoInHeader ? null : (
                <>
                  <text>
                    {repoInfo.path}
                    {repoInfo.branch ? (
                      <>
                        :<span fg={COLOR.CYAN}>{repoInfo.branch}</span>
                      </>
                    ) : null}{" "}
                  </text>
                </>
              )}
              <text>
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
                [PERMISSION_PATTERN.TASK]: PERMISSION.ALLOW,
                [PERMISSION_PATTERN.ASK]: PERMISSION.ASK,
              }}
            />
          </box>
          {/* Chat body: response area (relative) + input footer. Palette floats inside response area. */}
          <box flexDirection="column" flexGrow={1} minHeight={0} width="100%" height="100%">
            {/* Response area: when palette is open, replace messages with palette */}
            {isPaletteOpen ? (
              <box
                flexDirection="column"
                flexGrow={1}
                minHeight={0}
                width="100%"
                alignItems="center"
                justifyContent="flex-start"
                overflow="hidden"
              >
                <CommandPalette
                  commands={slashCommands}
                  isOpen={true}
                  onClose={() => setPaletteOpen(false)}
                  onSelect={handleCommandSelect}
                />
              </box>
            ) : (
              <box flexDirection="column" flexGrow={1} minHeight={0} width="100%" overflow="hidden">
                {/* Message area */}
                <box flexShrink={0} minWidth={0}>
                  <MessageList messages={messages} isFocused={focusTarget === FOCUS_TARGET.CHAT} />
                </box>
                {/* Spacer: fills space so footer stays at bottom; when no messages, show fact right above input */}
                {messages.length === 0 && factDisplayLine ? (
                  <box
                    flexGrow={1}
                    minHeight={0}
                    flexShrink={1}
                    flexDirection="column"
                    justifyContent="flex-end"
                  >
                    <box flexGrow={1} minHeight={0} />
                    <box width="100%" overflow="hidden" minWidth={0}>
                      <text fg={COLOR.DIM} attributes={TextAttributes.DIM} truncate={true}>
                        {factDisplayLine}
                      </text>
                    </box>
                  </box>
                ) : (
                  <box flexGrow={1} minHeight={0} flexShrink={1} />
                )}
              </box>
            )}

            {/* Footer - input always at bottom */}
            <box flexDirection="column" flexShrink={0}>
              <InputWithAutocomplete
                value={inputValue}
                onSubmit={handleSubmit}
                onChange={setInputValue}
                multiline
                focusTarget={focusTarget}
                slashCommands={slashCommands}
                placeholder="Type a message or / for commands…"
                shellCompletion={shellCompletion}
                onAgentSwitch={onOpenAgentSelect}
                vimEnabled={vimEnabled}
              />
            </box>
          </box>
        </box>
      </TruncationProvider>
    );
  }
);

Chat.displayName = "Chat";
