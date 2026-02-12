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
});
