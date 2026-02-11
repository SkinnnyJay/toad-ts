import { describe, expect, it } from "vitest";
import {
  AGENT_MANAGEMENT_COMMAND,
  AgentManagementCommandRequestSchema,
  AgentManagementCommandResultSchema,
  AgentManagementSessionSchema,
} from "../../../src/types/agent-management.types";

describe("agent-management types", () => {
  it("parses command request payloads", () => {
    const parsed = AgentManagementCommandRequestSchema.parse({
      command: AGENT_MANAGEMENT_COMMAND.MCP,
      args: ["list"],
    });

    expect(parsed.command).toBe("mcp");
    expect(parsed.args).toEqual(["list"]);
  });

  it("supports list command requests", () => {
    const parsed = AgentManagementCommandRequestSchema.parse({
      command: AGENT_MANAGEMENT_COMMAND.LIST,
    });

    expect(parsed.command).toBe("ls");
    expect(parsed.args).toEqual([]);
  });

  it("defaults command args when omitted", () => {
    const parsed = AgentManagementCommandRequestSchema.parse({
      command: AGENT_MANAGEMENT_COMMAND.STATUS,
    });

    expect(parsed.args).toEqual([]);
  });

  it("parses command execution results", () => {
    const parsed = AgentManagementCommandResultSchema.parse({
      stdout: "ok",
      stderr: "",
      exitCode: 0,
    });

    expect(parsed.exitCode).toBe(0);
  });

  it("parses agent session summaries", () => {
    const parsed = AgentManagementSessionSchema.parse({
      id: "session-1",
      title: "Session",
      createdAt: "2026-02-11T00:00:00.000Z",
      model: "gpt-5",
      messageCount: 12,
    });

    expect(parsed.id).toBe("session-1");
    expect(parsed.messageCount).toBe(12);
  });
});
