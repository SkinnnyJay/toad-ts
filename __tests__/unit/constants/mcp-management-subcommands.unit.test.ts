import { MCP_MANAGEMENT_SUBCOMMAND } from "@/constants/mcp-management-subcommands";
import { describe, expect, it } from "vitest";

describe("mcp management subcommands constants", () => {
  it("exposes canonical MCP subcommand values", () => {
    expect(MCP_MANAGEMENT_SUBCOMMAND).toEqual({
      LIST: "list",
      ENABLE: "enable",
      DISABLE: "disable",
      LIST_TOOLS: "list-tools",
    });
  });
});
