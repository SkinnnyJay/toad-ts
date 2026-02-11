import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { ENV_KEY } from "@/constants/env-keys";
import { SESSION_MODE } from "@/constants/session-modes";
import {
  SLASH_COMMAND_MESSAGE,
  formatAddDirMessage,
  formatPermissionsMessage,
  formatReviewMessage,
  formatSecurityReviewMessage,
  formatStatusMessage,
} from "@/constants/slash-command-messages";
import { EnvManager } from "@/utils/env/env.utils";
import type { SlashCommandDeps } from "./slash-command-runner";

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
};

export const handleLoginCommand = (deps: SlashCommandDeps): void => {
  deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.LOGIN_NOT_AVAILABLE);
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
