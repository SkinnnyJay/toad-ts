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
  { name: SLASH_COMMAND.HELP, description: "Show available commands" },
  { name: SLASH_COMMAND.DETAILS, description: "Toggle tool execution details" },
  {
    name: SLASH_COMMAND.MODE,
    description: "Change session mode",
    args: `<${SESSION_MODE.READ_ONLY}|${SESSION_MODE.AUTO}|${SESSION_MODE.FULL_ACCESS}>`,
  },
  { name: SLASH_COMMAND.MODELS, description: "Show or set model", args: "<modelId>" },
  { name: SLASH_COMMAND.NEW, description: "Create a new session", args: "<title>" },
  { name: SLASH_COMMAND.CLEAR, description: "Clear chat messages" },
  { name: SLASH_COMMAND.PLAN, description: "Create a new plan", args: "<title>" },
  { name: SLASH_COMMAND.RENAME, description: "Rename current session", args: "<title>" },
  { name: SLASH_COMMAND.SESSIONS, description: "Browse sessions" },
  { name: "/approve", description: "Approve pending tool call" },
  { name: "/deny", description: "Deny pending tool call" },
  { name: SLASH_COMMAND.SETTINGS, description: "Open settings" },
  { name: SLASH_COMMAND.THINKING, description: "Toggle thinking blocks" },
  { name: SLASH_COMMAND.EXPORT, description: "Export session to file", args: "<filename>" },
  { name: "/import", description: "Import session from file", args: "<filename>" },
];
