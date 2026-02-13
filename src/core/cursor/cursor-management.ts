import { SESSION_MODE } from "@/constants/session-modes";
import {
  CLI_AGENT_AUTH_METHOD,
  CLI_AGENT_MODE,
  CLI_AGENT_SANDBOX_MODE,
} from "@/types/cli-agent.types";
import type {
  CliAgentAboutResult,
  CliAgentAuthStatus,
  CliAgentLoginResult,
  CliAgentLogoutResult,
  CliAgentMcpListResult,
  CliAgentMode,
  CliAgentModelsResponse,
  CliAgentModelsResult,
  CliAgentSandboxMode,
  CliAgentStatusResult,
} from "@/types/cli-agent.types";
import type {
  CursorAboutInfo,
  CursorAuthCommandResult,
  CursorMcpServerStatus,
} from "./cursor-command-parsers";

const SESSION_MODE_TO_CLI_MODE: Record<string, CliAgentMode> = {
  [SESSION_MODE.AUTO]: CLI_AGENT_MODE.AGENT,
  [SESSION_MODE.FULL_ACCESS]: CLI_AGENT_MODE.AGENT,
  [SESSION_MODE.READ_ONLY]: CLI_AGENT_MODE.ASK,
} as const;

export const toSandboxMode = (enabled: boolean | undefined): CliAgentSandboxMode | undefined => {
  if (enabled === undefined) {
    return undefined;
  }
  return enabled ? CLI_AGENT_SANDBOX_MODE.ENABLED : CLI_AGENT_SANDBOX_MODE.DISABLED;
};

export const resolveCliMode = (mode: string): CliAgentMode | undefined => {
  if (
    mode === CLI_AGENT_MODE.AGENT ||
    mode === CLI_AGENT_MODE.PLAN ||
    mode === CLI_AGENT_MODE.ASK
  ) {
    return mode;
  }
  return SESSION_MODE_TO_CLI_MODE[mode];
};

export const toLoginResult = (result: CursorAuthCommandResult): CliAgentLoginResult => ({
  supported: true,
  authenticated: result.success,
  message: result.message,
  ...(result.requiresBrowser ? { requiresBrowser: true } : {}),
  command: "cursor-agent login",
});

export const toLogoutResult = (result: CursorAuthCommandResult): CliAgentLogoutResult => ({
  supported: true,
  loggedOut: result.success,
  message: result.message,
  command: "cursor-agent logout",
});

export const toStatusResult = (auth: CliAgentAuthStatus): CliAgentStatusResult => ({
  supported: true,
  authenticated: auth.authenticated,
  method: auth.method ?? CLI_AGENT_AUTH_METHOD.NONE,
  ...(auth.email ? { email: auth.email } : {}),
});

export const toAboutResult = (about: CursorAboutInfo): CliAgentAboutResult => ({
  supported: true,
  ...(about.cliVersion ? { version: about.cliVersion } : {}),
  ...(about.model ? { model: about.model } : {}),
  ...(about.os ? { os: about.os } : {}),
  ...(about.shell ? { shell: about.shell } : {}),
  ...(about.userEmail ? { userEmail: about.userEmail } : {}),
  details: about.fields,
});

export const toModelsResult = (models: CliAgentModelsResponse): CliAgentModelsResult => ({
  supported: true,
  models: models.models.map((model) => model.id),
  ...(models.currentModel ? { activeModel: models.currentModel } : {}),
});

export const toMcpResult = (servers: CursorMcpServerStatus[]): CliAgentMcpListResult => ({
  supported: true,
  servers,
});
