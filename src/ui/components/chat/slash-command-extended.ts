import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SESSION_MODE } from "@/constants/session-modes";
import {
  SLASH_COMMAND_MESSAGE,
  formatAddDirMessage,
  formatPermissionsMessage,
  formatReviewMessage,
  formatSecurityReviewMessage,
  formatStatusMessage,
} from "@/constants/slash-command-messages";
import {
  parseAuthStatusOutput,
  parseKeyValueLines,
} from "@/core/agent-management/cli-output-parser";
import { EnvManager } from "@/utils/env/env.utils";
import type { SlashCommandDeps } from "./slash-command-runner";

const MANAGEMENT_COMMAND = {
  LOGIN: "login",
  LOGOUT: "logout",
  STATUS: "status",
  SETUP_TOKEN: "setup-token",
  MODELS: "models",
  MCP: "mcp",
  LIST: "list",
} as const;

const PREVIEW_LINE_LIMIT = 8;

const buildOutputPreview = (stdout: string, stderr: string): string => {
  const combined = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, PREVIEW_LINE_LIMIT);
  return combined.join("\n");
};

const buildCommandResultMessage = (
  title: string,
  result: { stdout: string; stderr: string; exitCode: number }
): string => {
  const preview = buildOutputPreview(result.stdout, result.stderr);
  if (preview.length === 0) {
    return `${title}\n(exit ${result.exitCode})`;
  }
  return `${title}\n${preview}`;
};

const resolveStatusArgs = (harnessId: string | undefined): string[] | null => {
  switch (harnessId) {
    case HARNESS_DEFAULT.CURSOR_CLI_ID:
      return [MANAGEMENT_COMMAND.STATUS];
    case HARNESS_DEFAULT.CODEX_CLI_ID:
      return [MANAGEMENT_COMMAND.LOGIN, MANAGEMENT_COMMAND.STATUS];
    default:
      return null;
  }
};

export const handleAddDirCommand = (parts: string[], deps: SlashCommandDeps): void => {
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  const dirPath = parts.slice(1).join(" ").trim();
  if (!dirPath) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.ADD_DIR_MISSING);
    return;
  }
  const resolvedPath = resolve(process.cwd(), dirPath);
  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isDirectory()) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.ADD_DIR_NOT_FOUND);
    return;
  }
  const existing = deps.getContextAttachments?.(deps.sessionId) ?? [];
  if (!existing.includes(resolvedPath)) {
    deps.setContextAttachments?.(deps.sessionId, [...existing, resolvedPath]);
  }
  deps.appendSystemMessage(formatAddDirMessage(resolvedPath));
};

export const handlePermissionsCommand = (deps: SlashCommandDeps): void => {
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  const session = deps.getSession(deps.sessionId);
  const mode = session?.mode ?? SESSION_MODE.AUTO;
  const lines = [
    `Session mode: ${mode}`,
    "Read tools: always allowed",
    `Write/Edit tools: ${mode === SESSION_MODE.FULL_ACCESS ? "auto-approved" : "requires approval"}`,
    `Execute tools: ${mode === SESSION_MODE.FULL_ACCESS ? "auto-approved" : "requires approval"}`,
    "Delete tools: denied",
  ];
  deps.appendSystemMessage(formatPermissionsMessage(lines));
};

export const handleStatusCommand = (deps: SlashCommandDeps): void => {
  const session = deps.sessionId ? deps.getSession(deps.sessionId) : undefined;
  const messages = deps.sessionId ? deps.getMessagesForSession(deps.sessionId) : [];
  const env = EnvManager.getInstance().getSnapshot();
  const lines = [
    `Connection: ${deps.connectionStatus ?? "unknown"}`,
    `Session: ${deps.sessionId ?? "none"}`,
    `Agent: ${session?.agentId ?? "none"}`,
    `Mode: ${session?.mode ?? "none"}`,
    `Messages: ${messages.length}`,
    `Model: ${session?.metadata?.model ?? "default"}`,
    `Node: ${process.version}`,
    `Platform: ${process.platform}`,
    `Anthropic key: ${env[ENV_KEY.ANTHROPIC_API_KEY] ? "configured" : "not set"}`,
    `OpenAI key: ${env[ENV_KEY.OPENAI_API_KEY] ? "configured" : "not set"}`,
  ];
  deps.appendSystemMessage(formatStatusMessage(lines));

  if (!deps.runAgentCommand) {
    return;
  }

  const statusArgs = resolveStatusArgs(deps.activeHarnessId);
  if (!statusArgs) {
    return;
  }

  void deps
    .runAgentCommand(statusArgs)
    .then((result) => {
      if (result.exitCode !== 0) {
        deps.appendSystemMessage(
          `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${buildOutputPreview(
            result.stdout,
            result.stderr
          )}`
        );
        return;
      }

      const combinedOutput = `${result.stdout}\n${result.stderr}`;
      const keyValues = parseKeyValueLines(combinedOutput);
      if (Object.keys(keyValues).length > 0) {
        const mapped = Object.entries(keyValues)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
        deps.appendSystemMessage(
          `Agent status (${deps.activeAgentName ?? deps.activeHarnessId ?? "active"}):\n${mapped}`
        );
        return;
      }

      const auth = parseAuthStatusOutput(combinedOutput);
      deps.appendSystemMessage(
        `Agent status (${deps.activeAgentName ?? deps.activeHarnessId ?? "active"}):\n` +
          `Authenticated: ${auth.authenticated ? "yes" : "no"}`
      );
    })
    .catch((error) => {
      deps.appendSystemMessage(
        `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
};

export const handleLoginCommand = (deps: SlashCommandDeps): void => {
  if (!deps.runAgentCommand) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.LOGIN_NOT_AVAILABLE);
    return;
  }

  if (deps.activeHarnessId === HARNESS_DEFAULT.GEMINI_CLI_ID) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.GEMINI_LOGIN_HINT);
    return;
  }

  const args =
    deps.activeHarnessId === HARNESS_DEFAULT.CLAUDE_CLI_ID
      ? [MANAGEMENT_COMMAND.SETUP_TOKEN]
      : [MANAGEMENT_COMMAND.LOGIN];

  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.LOGIN_STARTING);
  void deps
    .runAgentCommand(args)
    .then((result) => {
      if (result.exitCode !== 0) {
        deps.appendSystemMessage(
          `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${buildOutputPreview(
            result.stdout,
            result.stderr
          )}`
        );
        return;
      }
      deps.appendSystemMessage(buildCommandResultMessage("Login command completed.", result));
    })
    .catch((error) => {
      deps.appendSystemMessage(
        `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
};

export const handleLogoutCommand = (deps: SlashCommandDeps): void => {
  if (!deps.runAgentCommand) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.LOGOUT_NOT_AVAILABLE);
    return;
  }

  if (
    deps.activeHarnessId === HARNESS_DEFAULT.CLAUDE_CLI_ID ||
    deps.activeHarnessId === HARNESS_DEFAULT.GEMINI_CLI_ID
  ) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.LOGOUT_UNSUPPORTED);
    return;
  }

  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.LOGOUT_STARTING);
  void deps
    .runAgentCommand([MANAGEMENT_COMMAND.LOGOUT])
    .then((result) => {
      if (result.exitCode !== 0) {
        deps.appendSystemMessage(
          `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${buildOutputPreview(
            result.stdout,
            result.stderr
          )}`
        );
        return;
      }
      deps.appendSystemMessage(buildCommandResultMessage("Logout command completed.", result));
    })
    .catch((error) => {
      deps.appendSystemMessage(
        `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
};

export const handleConfigCommand = (deps: SlashCommandDeps): void => {
  if (deps.openSettings) {
    deps.openSettings();
    return;
  }
  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.CONFIG_NOT_AVAILABLE);
};

export const handleInitCommand = (deps: SlashCommandDeps): void => {
  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.INIT_STARTING);
  void import("@/core/cross-tool/init-generator")
    .then(({ generateToadstoolMd }) => generateToadstoolMd(process.cwd()))
    .then((filePath) => {
      deps.appendSystemMessage(`${SLASH_COMMAND_MESSAGE.INIT_COMPLETE} Created: ${filePath}`);
    })
    .catch(() => {
      deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.INIT_FAILED);
    });
};

export const handleReviewCommand = (deps: SlashCommandDeps): void => {
  if (!deps.sessionId || !deps.runSummary) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.REVIEW_NOT_AVAILABLE);
    return;
  }
  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.REVIEW_STARTING);
  void deps
    .runSummary(
      "Review the recent code changes in this session. Check for bugs, code quality issues, and suggest improvements.",
      deps.sessionId
    )
    .then((sid) => {
      if (sid) deps.appendSystemMessage(formatReviewMessage(sid));
    })
    .catch(() => deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.REVIEW_NOT_AVAILABLE));
};

export const handleSecurityReviewCommand = (deps: SlashCommandDeps): void => {
  if (!deps.sessionId || !deps.runSummary) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.REVIEW_NOT_AVAILABLE);
    return;
  }
  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.SECURITY_REVIEW_STARTING);
  void deps
    .runSummary(
      "Perform a security review of the recent code changes. Check for vulnerabilities, injection risks, credential exposure, and insecure patterns.",
      deps.sessionId
    )
    .then((sid) => {
      if (sid) deps.appendSystemMessage(formatSecurityReviewMessage(sid));
    })
    .catch(() => deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.REVIEW_NOT_AVAILABLE));
};

export const handleMcpCommand = (parts: string[], deps: SlashCommandDeps): void => {
  if (!deps.runAgentCommand) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.MCP_NOT_AVAILABLE);
    return;
  }
  if (
    deps.activeHarnessId === HARNESS_DEFAULT.CODEX_CLI_ID ||
    deps.activeHarnessId === HARNESS_DEFAULT.MOCK_ID
  ) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.MCP_UNSUPPORTED);
    return;
  }

  const subcommand = parts.slice(1);
  const args =
    subcommand.length > 0
      ? [MANAGEMENT_COMMAND.MCP, ...subcommand]
      : deps.activeHarnessId === HARNESS_DEFAULT.GEMINI_CLI_ID
        ? [MANAGEMENT_COMMAND.MCP]
        : [MANAGEMENT_COMMAND.MCP, MANAGEMENT_COMMAND.LIST];

  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.MCP_STARTING);
  void deps
    .runAgentCommand(args)
    .then((result) => {
      if (result.exitCode !== 0) {
        deps.appendSystemMessage(
          `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${buildOutputPreview(
            result.stdout,
            result.stderr
          )}`
        );
        return;
      }
      deps.appendSystemMessage(buildCommandResultMessage("MCP command result:", result));
    })
    .catch((error) => {
      deps.appendSystemMessage(
        `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
};

export const handleAgentCommand = (parts: string[], deps: SlashCommandDeps): void => {
  if (!deps.runAgentCommand) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.AGENT_COMMAND_NOT_AVAILABLE);
    return;
  }
  const args = parts.slice(1);
  if (args.length === 0) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.AGENT_COMMAND_USAGE);
    return;
  }
  void deps
    .runAgentCommand(args)
    .then((result) => {
      if (result.exitCode !== 0) {
        deps.appendSystemMessage(
          `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${buildOutputPreview(
            result.stdout,
            result.stderr
          )}`
        );
        return;
      }
      deps.appendSystemMessage(buildCommandResultMessage("Agent command result:", result));
    })
    .catch((error) => {
      deps.appendSystemMessage(
        `${SLASH_COMMAND_MESSAGE.AGENT_COMMAND_FAILED} ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
};
