import {
  MCP_SERVER_STATUS,
  formatMcpToolPreview,
  parseMcpServerListCommandResult,
  parseMcpServerListOutput,
  parseMcpServerToolsCommandResult,
  parseMcpServerToolsOutput,
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

  it("parses MCP server tools output and drops header/noise lines", () => {
    const parsed = parseMcpServerToolsOutput(
      ["Tools:", "read_file - Reads a file", "write_file", "[warn] stale cache"].join("\n")
    );

    expect(parsed).toEqual(["read_file", "write_file"]);
  });

  it("parses mcp list-tools command with stderr fallback and empty guards", () => {
    const parsedWithFallback = parseMcpServerToolsCommandResult(
      {
        stdout: "[warn] unable to write cache",
        stderr: "list_files\ndelete_file",
        exitCode: 0,
      },
      "filesystem"
    );
    expect(parsedWithFallback).toEqual(["list_files", "delete_file"]);

    const parsedEmpty = parseMcpServerToolsCommandResult(
      {
        stdout: "No tools",
        stderr: "stale_tool",
        exitCode: 0,
      },
      "filesystem"
    );
    expect(parsedEmpty).toEqual([]);
  });

  it("formats tool preview with overflow suffix", () => {
    const preview = formatMcpToolPreview(["a", "b", "c", "d", "e", "f", "g", "h", "i"]);
    expect(preview).toBe("a, b, c, d, e, f, g, h … +1 more");
  });
});
