import { SESSION_MODE } from "@/constants/session-modes";
import { SLASH_COMMAND } from "@/constants/slash-commands";

export interface CommandDefinition {
  name: string;
  description: string;
  args?: string;
  category?: string;
}

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  { name: SLASH_COMMAND.CONNECT, description: "Open provider connection settings" },
  { name: SLASH_COMMAND.COMPACT, description: "Run compaction for the current session" },
  { name: SLASH_COMMAND.CONTEXT, description: "Show context usage" },
  { name: SLASH_COMMAND.COST, description: "Show usage cost" },
  { name: SLASH_COMMAND.DOCTOR, description: "Run diagnostics" },
  { name: SLASH_COMMAND.DEBUG, description: "Show debug info" },
  { name: SLASH_COMMAND.EDITOR, description: "Open external editor for input" },
  { name: SLASH_COMMAND.HELP, description: "Show available commands" },
  { name: SLASH_COMMAND.DETAILS, description: "Toggle tool execution details" },
  { name: SLASH_COMMAND.MEMORY, description: "Edit memory files", args: "[agents|claude|both]" },
  {
    name: SLASH_COMMAND.MODE,
    description: "Change session mode",
    args: `<${SESSION_MODE.READ_ONLY}|${SESSION_MODE.AUTO}|${SESSION_MODE.FULL_ACCESS}>`,
  },
  { name: SLASH_COMMAND.MODELS, description: "Show or set model", args: "<modelId>" },
  { name: SLASH_COMMAND.NEW, description: "Create a new session", args: "<title>" },
  { name: SLASH_COMMAND.CLEAR, description: "Clear chat messages" },
  { name: SLASH_COMMAND.COPY, description: "Copy last assistant response" },
  { name: SLASH_COMMAND.PLAN, description: "Create a new plan", args: "<title>" },
  {
    name: SLASH_COMMAND.REWIND,
    description: "Rewind conversation",
    args: "<count|list|delete> [code|conversation|both|summarize|id]",
  },
  { name: SLASH_COMMAND.RENAME, description: "Rename current session", args: "<title>" },
  { name: SLASH_COMMAND.SESSIONS, description: "Browse sessions" },
  { name: "/approve", description: "Approve pending tool call" },
  { name: "/deny", description: "Deny pending tool call" },
  { name: SLASH_COMMAND.SETTINGS, description: "Open settings" },
  { name: SLASH_COMMAND.STATS, description: "Show usage stats" },
  { name: SLASH_COMMAND.THEMES, description: "Open theme selector" },
  { name: SLASH_COMMAND.THINKING, description: "Toggle thinking blocks" },
  { name: SLASH_COMMAND.VIM, description: "Toggle vim input mode" },
  { name: SLASH_COMMAND.UNDO, description: "Undo last message" },
  { name: SLASH_COMMAND.REDO, description: "Redo last undone message" },
  { name: SLASH_COMMAND.SHARE, description: "Share current session to file" },
  { name: SLASH_COMMAND.UNSHARE, description: "Remove shared session file" },
  { name: SLASH_COMMAND.EXPORT, description: "Export session to file", args: "<filename>" },
  { name: "/import", description: "Import session from file", args: "<filename>" },
];
