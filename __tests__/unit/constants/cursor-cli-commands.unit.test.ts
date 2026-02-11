import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { CURSOR_CLI_COMMAND } from "@/constants/cursor-cli-commands";
import { describe, expect, it } from "vitest";

describe("CURSOR_CLI_COMMAND", () => {
  it("maps management command aliases consistently", () => {
    expect(CURSOR_CLI_COMMAND.STATUS).toBe(AGENT_MANAGEMENT_COMMAND.STATUS);
    expect(CURSOR_CLI_COMMAND.MODELS).toBe(AGENT_MANAGEMENT_COMMAND.MODELS);
    expect(CURSOR_CLI_COMMAND.LIST).toBe(AGENT_MANAGEMENT_COMMAND.LIST);
  });

  it("defines cursor-specific command literals", () => {
    expect(CURSOR_CLI_COMMAND.VERSION).toBe("--version");
    expect(CURSOR_CLI_COMMAND.CREATE_CHAT).toBe("create-chat");
  });
});
