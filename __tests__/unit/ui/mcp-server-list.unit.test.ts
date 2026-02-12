import {
  MCP_SERVER_STATUS,
  parseMcpServerListCommandResult,
  parseMcpServerListOutput,
  toMcpServersFromSession,
} from "@/ui/utils/mcp-server-list";
import { describe, expect, it } from "vitest";

describe("mcp-server-list", () => {
  it("parses MCP server list output with enabled and disabled statuses", () => {
    const parsed = parseMcpServerListOutput(
      ["Name Status", "github enabled", "filesystem disabled"].join("\n")
    );

    expect(parsed).toEqual([
      { id: "github", status: MCP_SERVER_STATUS.ENABLED, enabled: true },
      { id: "filesystem", status: MCP_SERVER_STATUS.DISABLED, enabled: false },
    ]);
  });

  it("maps configured MCP servers from session metadata", () => {
    const parsed = toMcpServersFromSession({
      id: "session-1",
      title: "Session",
      messageIds: [],
      createdAt: 1,
      updatedAt: 1,
      mode: "auto",
      metadata: {
        mcpServers: [
          { name: "github", type: "http", url: "https://example.com", headers: [] },
          { name: "filesystem", command: "npx", args: [], env: [] },
        ],
      },
    });

    expect(parsed).toEqual([
      { id: "github", status: MCP_SERVER_STATUS.CONFIGURED, enabled: null },
      { id: "filesystem", status: MCP_SERVER_STATUS.CONFIGURED, enabled: null },
    ]);
  });

  it("throws command failure output when mcp list command exits non-zero", () => {
    expect(() =>
      parseMcpServerListCommandResult({
        stdout: "",
        stderr: "permission denied",
        exitCode: 1,
      })
    ).toThrow("permission denied");
  });

  it("falls back to stderr output when stdout has warning noise", () => {
    const parsed = parseMcpServerListCommandResult({
      stdout: "[warn] using fallback channel",
      stderr: "github enabled",
      exitCode: 0,
    });

    expect(parsed).toEqual([{ id: "github", status: MCP_SERVER_STATUS.ENABLED, enabled: true }]);
  });

  it("preserves explicit empty stdout status over stale stderr entries", () => {
    const parsed = parseMcpServerListCommandResult({
      stdout: "No MCP servers configured.",
      stderr: "legacy enabled",
      exitCode: 0,
    });

    expect(parsed).toEqual([]);
  });
});
