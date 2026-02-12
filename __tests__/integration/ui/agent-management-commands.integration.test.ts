import { readFileSync } from "node:fs";
import path from "node:path";
import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { runAgentCommand } from "@/ui/components/chat/agent-management-command-service";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

describe("agent management commands integration", () => {
  afterEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
  });

  it("routes /agent (no subcommand) to status command output", async () => {
    const execaMock = await getExecaMock();
    const statusOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/status-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: statusOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.AGENT, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("Authenticated:");
    expect(execaMock).toHaveBeenCalledWith(
      "cursor-agent",
      ["status"],
      expect.objectContaining({ reject: false })
    );
  });

  it("routes /agent models to parsed model listing", async () => {
    const execaMock = await getExecaMock();
    const modelsOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/models-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: modelsOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["models"]
    );

    expect(lines.some((line) => line.includes("opus-4.6-thinking"))).toBe(true);
  });

  it("returns guidance for unsupported /agent subcommand", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["invalid"]
    );

    expect(lines[0]).toContain("Unsupported /agent subcommand");
  });

  it("formats non-cursor /agent about command via version output", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "codex 0.1.0",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      {
        activeHarness: harness,
      },
      ["about"]
    );

    expect(lines[0]).toBe("Version: codex 0.1.0");
    expect(execaMock).toHaveBeenCalledWith(
      "codex",
      ["--version"],
      expect.objectContaining({ reject: false })
    );
  });

  it("parses codex status from login status output", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "Authenticated as dev@example.com",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      activeHarness: harness,
    });

    expect(lines).toContain("Authenticated: yes");
    expect(lines).toContain("Email: dev@example.com");
    expect(lines.some((line) => line.startsWith("Status: Authenticated as"))).toBe(true);
    expect(execaMock).toHaveBeenCalledWith(
      "codex",
      ["login", "status"],
      expect.objectContaining({ reject: false })
    );
  });

  it("parses codex unauthenticated status from stderr", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "",
      stderr: "Not logged in. Please login required.",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      activeHarness: harness,
    });

    expect(lines).toContain("Authenticated: no");
    expect(lines).toContain("Status: Not authenticated");
  });

  it("formats claude MCP list output through command parser wrappers", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "filesystem: connected\nmemory: disabled (missing token)",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "claude-cli",
      name: "Claude CLI",
      command: "claude-code-acp",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MCP, {
      activeHarness: harness,
    });

    expect(lines).toEqual(["- filesystem: connected", "- memory: disabled (missing token)"]);
  });

  it("routes /agent mcp list to cursor native MCP parser", async () => {
    const execaMock = await getExecaMock();
    const mcpOutput = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/mcp-list-output.txt"),
      "utf8"
    );
    execaMock.mockResolvedValue({
      stdout: mcpOutput,
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(
      AGENT_MANAGEMENT_COMMAND.AGENT,
      { activeHarness: harness },
      ["mcp", "list"]
    );

    expect(lines.some((line) => line.includes("context7"))).toBe(true);
    expect(execaMock).toHaveBeenCalledWith(
      "cursor-agent",
      ["mcp", "list"],
      expect.objectContaining({ reject: false })
    );
  });

  it("returns browser login guidance for cursor harness", async () => {
    const harness = harnessConfigSchema.parse({
      id: "cursor-cli",
      name: "Cursor CLI",
      command: "cursor-agent",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.LOGIN, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("cursor-agent");
    expect(lines[0]).toContain("login");
    expect(lines[1]).toContain("browser");
  });

  it("returns model fallback hint when listing unsupported for codex", async () => {
    const harness = harnessConfigSchema.parse({
      id: "codex-cli",
      name: "Codex CLI",
      command: "codex",
      args: [],
      env: {},
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.MODELS, {
      activeHarness: harness,
    });

    expect(lines[0]).toContain("models is not supported");
    expect(lines[1]).toContain("/model <id>");
  });

  it("includes gemini session count in status output when available", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: "1. sess-100\n2. sess-200",
      stderr: "",
      exitCode: 0,
    });
    const harness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        GOOGLE_API_KEY: "google-key",
      },
    });

    const lines = await runAgentCommand(AGENT_MANAGEMENT_COMMAND.STATUS, {
      activeHarness: harness,
    });

    expect(lines).toContain("Authenticated: yes");
    expect(lines).toContain("Sessions: 2");
  });
});
