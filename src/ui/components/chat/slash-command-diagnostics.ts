import { ENV_KEY } from "@/constants/env-keys";
import {
  SLASH_COMMAND_MESSAGE,
  formatContextMessage,
  formatCostMessage,
  formatDebugMessage,
  formatDoctorMessage,
  formatStatsMessage,
} from "@/constants/slash-command-messages";
import { checkHarnessHealth } from "@/harness/harness-health";
import { EnvManager } from "@/utils/env/env.utils";
import { buildContextStats } from "./slash-command-helpers";
import type { SlashCommandDeps } from "./slash-command-runner";

export const handleDoctorCommand = (deps: SlashCommandDeps): void => {
  const env = EnvManager.getInstance().getSnapshot();
  const checks = [
    `Connection: ${deps.connectionStatus ?? "unknown"}`,
    `Anthropic API key: ${env[ENV_KEY.ANTHROPIC_API_KEY] ? "set" : "missing"}`,
    `OpenAI API key: ${env[ENV_KEY.OPENAI_API_KEY] ? "set" : "missing"}`,
    `Editor: ${env[ENV_KEY.VISUAL] ?? env[ENV_KEY.EDITOR] ?? "default"}`,
  ];
  if (deps.harnesses) {
    const health = checkHarnessHealth(deps.harnesses, env);
    for (const entry of health) {
      const status = entry.available ? "available" : "missing";
      checks.push(`Provider ${entry.name}: ${status} (${entry.command})`);
    }
  }
  deps.appendSystemMessage(formatDoctorMessage(checks));
};

export const handleDebugCommand = (deps: SlashCommandDeps): void => {
  const session = deps.sessionId ? deps.getSession(deps.sessionId) : undefined;
  const messages = deps.sessionId ? deps.getMessagesForSession(deps.sessionId) : [];
  const plan = deps.sessionId ? deps.getPlanBySession(deps.sessionId) : undefined;
  const lines = [
    `Session: ${deps.sessionId ?? "none"}`,
    `Agent: ${session?.agentId ?? "unknown"}`,
    `Mode: ${session?.mode ?? "unknown"}`,
    `Messages: ${messages.length}`,
    `Plan: ${plan ? plan.status : "none"}`,
  ];
  deps.appendSystemMessage(formatDebugMessage(lines));
};

export const handleStatsCommand = (deps: SlashCommandDeps): void => {
  const sessions = deps.listSessions();
  const sessionCount = sessions.length;
  const messageCount = deps.sessionId ? deps.getMessagesForSession(deps.sessionId).length : 0;
  const lines = [`Sessions: ${sessionCount}`, `Current session messages: ${messageCount}`];
  deps.appendSystemMessage(formatStatsMessage(lines));
};

export const handleCostCommand = (deps: SlashCommandDeps): void => {
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  const messages = deps.getMessagesForSession(deps.sessionId);
  const stats = buildContextStats(messages);
  const lines = ["Cost tracking not configured.", `Tokens (est): ${stats.tokens}`];
  deps.appendSystemMessage(formatCostMessage(lines));
};

export const handleContextCommand = (deps: SlashCommandDeps): void => {
  if (!deps.sessionId) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.NO_ACTIVE_SESSION);
    return;
  }
  if (deps.openContext) {
    deps.openContext();
    return;
  }
  const messages = deps.getMessagesForSession(deps.sessionId);
  const stats = buildContextStats(messages);
  const blockCount = messages.reduce((sum, message) => sum + message.content.length, 0);
  const lines = [
    `Messages: ${messages.length}`,
    `Blocks: ${blockCount}`,
    `Tokens (est): ${stats.tokens}`,
    `Chars: ${stats.chars}`,
    `Bytes: ${stats.bytes}`,
  ];
  deps.appendSystemMessage(formatContextMessage(lines));
};
