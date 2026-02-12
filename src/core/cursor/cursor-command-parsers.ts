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

const CURSOR_REGEX = {
  MODEL_LINE: /^(\S+)\s+-\s+(.+?)(?:\s{2,}\((.+)\))?$/,
  AUTH_EMAIL: /Logged in as\s+([^\s]+)/,
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
