import { CLI_AGENT_AUTH_METHOD } from "@/types/cli-agent.types";
import {
  type CliAgentAuthStatus,
  CliAgentAuthStatusSchema,
  type CliAgentModel,
  CliAgentModelSchema,
  type CliAgentModelsResponse,
  CliAgentModelsResponseSchema,
} from "@/types/cli-agent.types";

const CURSOR_MODEL_TAG = {
  CURRENT: "current",
  DEFAULT: "default",
} as const;

const CURSOR_ABOUT_KEY = {
  CLI_VERSION: "CLI Version",
  MODEL: "Model",
  OS: "OS",
  TERMINAL: "Terminal",
  SHELL: "Shell",
  USER_EMAIL: "User Email",
} as const;

const CURSOR_REGEX = {
  MODEL_LINE: /^(\S+)\s+-\s+(.+?)(?:\s{2,}\((.+)\))?$/,
  AUTH_EMAIL: /Logged in as\s+([^\s]+)/,
  LOGIN_EMAIL: /(Logged in as|Authenticated as)\s+([^\s]+)/i,
  LOGIN_BROWSER_HINT: /(open|opening).+browser|https?:\/\/\S+/i,
  LOGOUT_SUCCESS: /(logged out|logout completed|signed out)/i,
  ABOUT_LINE: /^(.+?)\s{2,}(.+)$/,
  MCP_LIST_LINE: /^([^:]+):\s*(.+?)(?:\s+\((.+)\))?$/,
} as const;

const toLines = (value: string): string[] => {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export const parseCursorModelsOutput = (output: string): CliAgentModelsResponse => {
  const lines = toLines(output);
  const models = lines
    .filter((line) => !line.startsWith("Available models"))
    .filter((line) => !line.startsWith("Tip:"))
    .map((line) => parseCursorModelLine(line))
    .filter((model): model is CliAgentModel => model !== null);

  const defaultModel = models.find((model) => model.isDefault)?.id;
  const currentModel = models.find((model) => model.isCurrent)?.id;

  return CliAgentModelsResponseSchema.parse({
    models,
    defaultModel,
    currentModel,
  });
};

export const parseCursorStatusOutput = (
  stdout: string,
  stderr: string,
  envApiKey?: string
): CliAgentAuthStatus => {
  const combined = `${stdout}\n${stderr}`;
  const emailMatch = combined.match(CURSOR_REGEX.AUTH_EMAIL);
  const authenticated = emailMatch !== null || Boolean(envApiKey);
  return CliAgentAuthStatusSchema.parse({
    authenticated,
    method: emailMatch
      ? CLI_AGENT_AUTH_METHOD.BROWSER_LOGIN
      : envApiKey
        ? CLI_AGENT_AUTH_METHOD.API_KEY
        : CLI_AGENT_AUTH_METHOD.NONE,
    email: emailMatch?.[1],
  });
};

export interface CursorAboutInfo {
  cliVersion?: string;
  model?: string;
  os?: string;
  terminal?: string;
  shell?: string;
  userEmail?: string;
  fields: Record<string, string>;
}

export interface CursorMcpServerStatus {
  name: string;
  status: string;
  reason?: string;
}

export interface CursorAuthCommandResult {
  success: boolean;
  message: string;
  email?: string;
  requiresBrowser?: boolean;
}

export const parseCursorAboutOutput = (output: string): CursorAboutInfo => {
  const fields: Record<string, string> = {};
  for (const line of toLines(output)) {
    const match = line.match(CURSOR_REGEX.ABOUT_LINE);
    if (!match) {
      continue;
    }
    const key = match[1]?.trim();
    const value = match[2]?.trim();
    if (!key || !value) {
      continue;
    }
    fields[key] = value;
  }

  return {
    cliVersion: fields[CURSOR_ABOUT_KEY.CLI_VERSION],
    model: fields[CURSOR_ABOUT_KEY.MODEL],
    os: fields[CURSOR_ABOUT_KEY.OS],
    terminal: fields[CURSOR_ABOUT_KEY.TERMINAL],
    shell: fields[CURSOR_ABOUT_KEY.SHELL],
    userEmail: fields[CURSOR_ABOUT_KEY.USER_EMAIL],
    fields,
  };
};

export const parseCursorMcpListOutput = (output: string): CursorMcpServerStatus[] => {
  return toLines(output)
    .map((line) => {
      const match = line.match(CURSOR_REGEX.MCP_LIST_LINE);
      if (!match) {
        return null;
      }
      const name = match[1]?.trim();
      const status = match[2]?.trim();
      const reason = match[3]?.trim();
      if (!name || !status) {
        return null;
      }
      return {
        name,
        status,
        ...(reason ? { reason } : {}),
      };
    })
    .filter((entry): entry is CursorMcpServerStatus => entry !== null);
};

export const parseCursorLoginOutput = (stdout: string, stderr: string): CursorAuthCommandResult => {
  const combined = `${stdout}\n${stderr}`;
  const emailMatch = combined.match(CURSOR_REGEX.LOGIN_EMAIL);
  if (emailMatch) {
    return {
      success: true,
      email: emailMatch[2],
      message: emailMatch[0],
    };
  }
  if (CURSOR_REGEX.LOGIN_BROWSER_HINT.test(combined)) {
    return {
      success: true,
      requiresBrowser: true,
      message: toLines(combined)[0] ?? "Browser login started.",
    };
  }
  return {
    success: false,
    message: toLines(combined)[0] ?? "No login output.",
  };
};

export const parseCursorLogoutOutput = (
  stdout: string,
  stderr: string
): CursorAuthCommandResult => {
  const combined = `${stdout}\n${stderr}`;
  if (CURSOR_REGEX.LOGOUT_SUCCESS.test(combined)) {
    return {
      success: true,
      message: toLines(combined)[0] ?? "Logout completed.",
    };
  }
  return {
    success: false,
    message: toLines(combined)[0] ?? "No logout output.",
  };
};

const parseCursorModelLine = (line: string): CliAgentModel | null => {
  const match = line.match(CURSOR_REGEX.MODEL_LINE);
  if (!match) {
    return null;
  }

  const id = match[1];
  const name = match[2];
  const tagsRaw = match[3];
  if (!id || !name) {
    return null;
  }

  const tags = (tagsRaw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  const isCurrent = tags.includes(CURSOR_MODEL_TAG.CURRENT);
  const isDefault = tags.includes(CURSOR_MODEL_TAG.DEFAULT);

  return CliAgentModelSchema.parse({
    id,
    name,
    isCurrent,
    isDefault,
  });
};
