import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AGENT_MANAGEMENT_CAPABILITY,
  AGENT_MANAGEMENT_COMMAND,
  HARNESS_ID,
} from "@/constants/agent-management-commands";
import { ENV_KEY } from "@/constants/env-keys";
import { MCP_SERVER_TYPE } from "@/constants/mcp-server-types";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { SessionSchema } from "@/types/domain";
import {
  getMergedHarnessEnv,
  hasCapability,
  isCursorHarness,
  mapClaudeStatusLines,
  mapCursorAboutLines,
  mapCursorLogoutLines,
  mapCursorModelLines,
  mapCursorStatusLines,
  mapGeminiStatusLines,
  mapMcpLines,
  mapStatusLines,
  parseAboutVersionForHarness,
  resolveNativeCommandArgs,
  unsupportedCapabilityMessage,
} from "@/ui/components/chat/agent-management-command-resolver";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, describe, expect, it } from "vitest";

const ORIGINAL_CURSOR_API_KEY = process.env[ENV_KEY.CURSOR_API_KEY];

afterEach(() => {
  if (ORIGINAL_CURSOR_API_KEY === undefined) {
    delete process.env[ENV_KEY.CURSOR_API_KEY];
  } else {
    process.env[ENV_KEY.CURSOR_API_KEY] = ORIGINAL_CURSOR_API_KEY;
  }
  EnvManager.resetInstance();
});

describe("agent-management-command-resolver", () => {
  it("maps native about and codex status command args", () => {
    const cursorHarness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });
    const codexHarness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });
    const claudeHarness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {},
    });
    const geminiHarness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {},
    });

    expect(resolveNativeCommandArgs(cursorHarness, AGENT_MANAGEMENT_COMMAND.ABOUT)).toEqual([
      AGENT_MANAGEMENT_COMMAND.ABOUT,
    ]);
    expect(resolveNativeCommandArgs(claudeHarness, AGENT_MANAGEMENT_COMMAND.ABOUT)).toEqual([
      "--version",
    ]);
    expect(resolveNativeCommandArgs(codexHarness, AGENT_MANAGEMENT_COMMAND.STATUS)).toEqual([
      AGENT_MANAGEMENT_COMMAND.LOGIN,
      AGENT_MANAGEMENT_COMMAND.STATUS,
    ]);
    expect(resolveNativeCommandArgs(geminiHarness, AGENT_MANAGEMENT_COMMAND.STATUS)).toEqual([
      "list-sessions",
    ]);
    expect(resolveNativeCommandArgs(cursorHarness, AGENT_MANAGEMENT_COMMAND.MCP, ["list"])).toEqual(
      [AGENT_MANAGEMENT_COMMAND.MCP, "list"]
    );
    expect(parseAboutVersionForHarness(claudeHarness, "claude 3.0.0")).toBe("claude 3.0.0");
    expect(parseAboutVersionForHarness(codexHarness, "codex 0.1.0")).toBe("codex 0.1.0");
    expect(parseAboutVersionForHarness(geminiHarness, "gemini 2.2.0")).toBe("gemini 2.2.0");
    expect(parseAboutVersionForHarness(cursorHarness, "cursor-agent 1.0.0")).toBe(
      "cursor-agent 1.0.0"
    );
  });

  it("reports capability support and unsupported messaging", () => {
    const codexHarness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    expect(hasCapability(codexHarness, AGENT_MANAGEMENT_CAPABILITY.MCP)).toBe(false);
    expect(unsupportedCapabilityMessage(codexHarness, AGENT_MANAGEMENT_CAPABILITY.MCP)).toContain(
      "Codex CLI"
    );
    expect(hasCapability(undefined, AGENT_MANAGEMENT_CAPABILITY.STATUS)).toBe(false);
  });

  it("derives claude and gemini status lines from env settings", () => {
    const claudeHarness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {
        [ENV_KEY.ANTHROPIC_API_KEY]: "anthropic-key",
      },
    });
    const geminiHarness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        [ENV_KEY.GEMINI_API_KEY]: "gemini-key",
      },
    });

    expect(mapClaudeStatusLines(claudeHarness)).toEqual(["Authenticated: yes", "Method: api_key"]);
    expect(mapGeminiStatusLines(geminiHarness)).toEqual([
      "Authenticated: yes",
      "Method: api_key",
      "Key source: GEMINI_API_KEY",
    ]);
  });

  it("derives gemini status key source for GOOGLE_API_KEY and unset", () => {
    const googleHarness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        [ENV_KEY.GOOGLE_API_KEY]: "google-key",
      },
    });
    const noKeyHarness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {},
    });

    expect(mapGeminiStatusLines(googleHarness)).toEqual([
      "Authenticated: yes",
      "Method: api_key",
      "Key source: GOOGLE_API_KEY",
    ]);
    expect(mapGeminiStatusLines(noKeyHarness)).toEqual([
      "Authenticated: no",
      "Method: none",
      "Key source: unset",
    ]);
  });

  it("formats cursor logout parser output via resolver mapper", () => {
    const cursorHarness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    expect(mapCursorLogoutLines(cursorHarness, "Logged out successfully", "")).toEqual([
      "Logged out: yes",
      "Command: cursor-agent logout",
      "Logged out successfully",
    ]);
  });

  it("maps connection/session fallback status summary lines", () => {
    const session = SessionSchema.parse({
      id: "sess-1",
      createdAt: 1,
      updatedAt: 2,
      mode: "auto",
      metadata: {
        mcpServers: [],
        model: "gpt-5",
      },
    });

    expect(
      mapStatusLines({
        connectionStatus: "connected",
        session,
        activeAgentName: "Cursor CLI",
      })
    ).toEqual([
      "Connection: connected",
      "Session: sess-1",
      "Agent: Cursor CLI",
      "Harness: none",
      "Mode: auto",
      "Model: gpt-5",
    ]);

    expect(mapStatusLines({})).toEqual([
      "Connection: unknown",
      "Session: none",
      "Agent: none",
      "Harness: none",
      "Mode: none",
      "Model: default",
    ]);
  });

  it("maps MCP session metadata for url and command servers", () => {
    const session = SessionSchema.parse({
      id: "sess-2",
      createdAt: 1,
      updatedAt: 2,
      mode: "auto",
      metadata: {
        model: "gpt-5",
        mcpServers: [
          {
            type: MCP_SERVER_TYPE.HTTP,
            name: "docs",
            url: "https://example.com/mcp",
            headers: [],
          },
          {
            name: "filesystem",
            command: "mcp-filesystem",
            args: [],
            env: [],
          },
        ],
      },
    });

    expect(mapMcpLines(session)).toEqual([
      "1. docs (https://example.com/mcp)",
      "2. filesystem (mcp-filesystem)",
    ]);
    expect(mapMcpLines(undefined)).toEqual(["No MCP servers configured for this session."]);
  });

  it("maps cursor status/model/about lines from native command output", () => {
    process.env[ENV_KEY.CURSOR_API_KEY] = "cursor-api-key";
    EnvManager.resetInstance();
    const modelsOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/models-output.txt"),
      "utf8"
    );
    const aboutOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/about-output.txt"),
      "utf8"
    );

    expect(mapCursorStatusLines("", "")).toEqual([
      "Authenticated: yes",
      "Method: api_key",
      "Email: unknown",
    ]);
    expect(mapCursorModelLines(modelsOutput).some((line) => line.includes("[current"))).toBe(true);
    expect(mapCursorModelLines("")).toEqual(["No models reported by cursor-agent."]);
    expect(mapCursorAboutLines(aboutOutput).some((line) => line.startsWith("Version:"))).toBe(true);
    expect(mapCursorAboutLines("custom-key  custom-value")).toEqual(["custom-key: custom-value"]);
  });

  it("identifies cursor harness and merges env with harness precedence", () => {
    process.env[ENV_KEY.ANTHROPIC_API_KEY] = "process-key";
    EnvManager.resetInstance();

    const cursorHarness = harnessConfigSchema.parse({
      id: HARNESS_ID.CURSOR_CLI,
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {
        [ENV_KEY.ANTHROPIC_API_KEY]: "harness-key",
      },
    });

    const merged = getMergedHarnessEnv(cursorHarness);
    expect(isCursorHarness(cursorHarness)).toBe(true);
    expect(merged[ENV_KEY.ANTHROPIC_API_KEY]).toBe("harness-key");
  });
});
