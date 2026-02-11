import { describe, expect, it } from "vitest";
import {
  AGENT_MANAGEMENT_COMMAND,
  AgentManagementCommandRequestSchema,
  AgentManagementCommandResultSchema,
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
});
