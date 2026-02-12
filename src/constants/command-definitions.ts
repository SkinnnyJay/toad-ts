import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND } from "@/constants/slash-commands";

export interface CommandDefinition {
  name: string;
  description: string;
  args?: string;
  category?: string;
  /** When set, slash command is shown only for these providers (agent id, name, or harnessId). */
  agents?: string[];
}

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    name: SLASH_COMMAND.ADD_DIR,
    description: "Add directory to session context",
    args: "<path>",
    category: "context",
  },
  { name: SLASH_COMMAND.AGENTS, description: "Open agent discovery panel", category: "agents" },
  { name: SLASH_COMMAND.CLEAR, description: "Clear chat messages", category: "session" },
  {
    name: SLASH_COMMAND.CLOUD,
    description: "Manage Cursor cloud agents",
    args: "[list|status|stop|followup] [args...]",
    category: "provider",
    agents: [HARNESS_DEFAULT.CURSOR_CLI_ID],
  },
  {
    name: SLASH_COMMAND.COMPACT,
    description: "Run compaction for the current session",
    category: "context",
  },
  { name: SLASH_COMMAND.CONFIG, description: "Open configuration panel", category: "settings" },
  {
    name: SLASH_COMMAND.CONNECT,
    description: "Open provider connection settings",
    category: "provider",
  },
  { name: SLASH_COMMAND.CONTEXT, description: "Manage context attachments", category: "context" },
  { name: SLASH_COMMAND.COPY, description: "Copy last assistant response", category: "session" },
  { name: SLASH_COMMAND.COST, description: "Show usage cost", category: "diagnostics" },
  { name: SLASH_COMMAND.DEBUG, description: "Show debug info", category: "diagnostics" },
  {
    name: SLASH_COMMAND.DETAILS,
    description: "Toggle tool execution details",
    category: "display",
  },
  { name: SLASH_COMMAND.DOCTOR, description: "Run diagnostics", category: "diagnostics" },
  {
    name: SLASH_COMMAND.EDITOR,
    description: "Open external editor for input",
    category: "input",
  },
  {
    name: SLASH_COMMAND.EXPORT,
    description: "Export session to file",
    args: "<filename>",
    category: "session",
  },
  { name: SLASH_COMMAND.HELP, description: "Show available commands", category: "help" },
  { name: SLASH_COMMAND.HOOKS, description: "Open hooks panel", category: "settings" },
  {
    name: SLASH_COMMAND.IMPORT,
    description: "Import session from file",
    args: "<filename>",
    category: "session",
  },
  {
    name: SLASH_COMMAND.INIT,
    description: "Generate TOADSTOOL.md for the project",
    category: "settings",
  },
  {
    name: SLASH_COMMAND.AGENT,
    description: "Run native command for active agent",
    args: "<subcommand...>",
    category: "provider",
  },
  { name: SLASH_COMMAND.LOGIN, description: "Authenticate with a provider", category: "provider" },
  { name: SLASH_COMMAND.LOGOUT, description: "Log out of active provider", category: "provider" },
  {
    name: SLASH_COMMAND.MEMORY,
    description: "Edit memory files",
    args: "[agents|claude|both]",
    category: "settings",
  },
  {
    name: SLASH_COMMAND.MCP,
    description: "Run native MCP command for active provider",
    args: "[list|enable|disable|login] [args...]",
    category: "provider",
  },
  {
    name: SLASH_COMMAND.MODEL,
    description: "Alias for /models",
    args: "<modelId>",
    category: "provider",
  },
  {
    name: SLASH_COMMAND.MODE,
    description: "Change session mode",
    args: `<${SESSION_MODE.READ_ONLY}|${SESSION_MODE.AUTO}|${SESSION_MODE.FULL_ACCESS}>`,
    category: "session",
  },
  {
    name: SLASH_COMMAND.MODELS,
    description: "Show or set model",
    args: "<modelId>",
    category: "provider",
  },
  {
    name: SLASH_COMMAND.NEW,
    description: "Create a new session",
    args: "<title>",
    category: "session",
  },
  {
    name: SLASH_COMMAND.PERMISSIONS,
    description: "Manage tool permissions",
    category: "settings",
  },
  {
    name: SLASH_COMMAND.PLAN,
    description: "Create a new plan",
    args: "<title>",
    category: "session",
  },
  { name: SLASH_COMMAND.PROGRESS, description: "Open progress panel", category: "display" },
  {
    name: SLASH_COMMAND.RENAME,
    description: "Rename current session",
    args: "<title>",
    category: "session",
  },
  {
    name: SLASH_COMMAND.REVIEW,
    description: "AI code review of recent changes",
    category: "agents",
  },
  {
    name: SLASH_COMMAND.REWIND,
    description: "Rewind conversation",
    args: "<count|list|delete> [code|conversation|both|summarize|id]",
    category: "session",
  },
  {
    name: SLASH_COMMAND.SECURITY_REVIEW,
    description: "AI security review of recent changes",
    category: "agents",
  },
  { name: SLASH_COMMAND.SESSIONS, description: "Browse sessions", category: "session" },
  { name: SLASH_COMMAND.SETTINGS, description: "Open settings", category: "settings" },
  { name: SLASH_COMMAND.SKILLS, description: "Browse discovered skills", category: "discovery" },
  {
    name: SLASH_COMMAND.COMMANDS,
    description: "Browse discovered commands",
    category: "discovery",
  },
  { name: SLASH_COMMAND.SHARE, description: "Share current session to file", category: "session" },
  { name: SLASH_COMMAND.STATS, description: "Show usage stats", category: "diagnostics" },
  {
    name: SLASH_COMMAND.STATUS,
    description: "Show system health and status",
    category: "diagnostics",
  },
  { name: SLASH_COMMAND.THEMES, description: "Open theme selector", category: "display" },
  { name: SLASH_COMMAND.THINKING, description: "Toggle thinking blocks", category: "display" },
  { name: SLASH_COMMAND.UNDO, description: "Undo last message", category: "session" },
  { name: SLASH_COMMAND.UNSHARE, description: "Remove shared session file", category: "session" },
  { name: SLASH_COMMAND.REDO, description: "Redo last undone message", category: "session" },
  { name: SLASH_COMMAND.VIM, description: "Toggle vim input mode", category: "input" },
  { name: "/approve", description: "Approve pending tool call", category: "tools" },
  { name: "/deny", description: "Deny pending tool call", category: "tools" },
];

/** Context used to filter slash commands by selected provider. */
export interface SlashCommandAgentContext {
  id: string;
  name: string;
  harnessId: string;
}

/**
 * Return slash commands that apply to the given agent. Commands without agents apply to all.
 */
export function filterSlashCommandsForAgent(
  commands: CommandDefinition[],
  agent: SlashCommandAgentContext | null
): CommandDefinition[] {
  if (agent === null) return commands;
  const norm = (s: string) => s.trim().toLowerCase();
  const agentValues = [norm(agent.id), norm(agent.name), norm(agent.harnessId)];
  return commands.filter((cmd) => {
    if (!cmd.agents || cmd.agents.length === 0) return true;
    return cmd.agents.some((a) => agentValues.includes(norm(a)));
  });
}
