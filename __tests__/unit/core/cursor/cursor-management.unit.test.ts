import { SESSION_MODE } from "@/constants/session-modes";
import {
  resolveCliMode,
  toAboutResult,
  toLoginResult,
  toLogoutResult,
  toMcpResult,
  toModelsResult,
  toSandboxMode,
  toStatusResult,
} from "@/core/cursor/cursor-management";
import {
  CLI_AGENT_AUTH_METHOD,
  CLI_AGENT_MODE,
  CLI_AGENT_SANDBOX_MODE,
} from "@/types/cli-agent.types";
import { describe, expect, it } from "vitest";

describe("cursor-management helpers", () => {
  it("maps session and native modes to CLI modes", () => {
    expect(resolveCliMode(SESSION_MODE.AUTO)).toBe(CLI_AGENT_MODE.AGENT);
    expect(resolveCliMode(SESSION_MODE.READ_ONLY)).toBe(CLI_AGENT_MODE.ASK);
    expect(resolveCliMode(CLI_AGENT_MODE.PLAN)).toBe(CLI_AGENT_MODE.PLAN);
  });

  it("maps sandbox boolean to cursor sandbox mode", () => {
    expect(toSandboxMode(true)).toBe(CLI_AGENT_SANDBOX_MODE.ENABLED);
    expect(toSandboxMode(false)).toBe(CLI_AGENT_SANDBOX_MODE.DISABLED);
    expect(toSandboxMode(undefined)).toBeUndefined();
  });

  it("maps auth and command outputs to typed management results", () => {
    const login = toLoginResult({
      success: true,
      message: "Opening browser for login...",
      requiresBrowser: true,
    });
    const logout = toLogoutResult({
      success: true,
      message: "Logged out successfully",
    });
    const status = toStatusResult({
      authenticated: true,
      method: CLI_AGENT_AUTH_METHOD.BROWSER_LOGIN,
      email: "dev@example.com",
    });
    const about = toAboutResult({
      cliVersion: "1.2.3",
      model: "gpt-5",
      os: "linux",
      shell: "bash",
      userEmail: "dev@example.com",
      fields: { shell: "bash" },
    });
    const models = toModelsResult({
      models: [
        {
          id: "gpt-5",
          name: "GPT-5",
          isCurrent: true,
          isDefault: true,
        },
      ],
      currentModel: "gpt-5",
      defaultModel: "gpt-5",
    });
    const mcp = toMcpResult([{ name: "filesystem", status: "connected" }]);

    expect(login.requiresBrowser).toBe(true);
    expect(logout.loggedOut).toBe(true);
    expect(status.method).toBe(CLI_AGENT_AUTH_METHOD.BROWSER_LOGIN);
    expect(about.version).toBe("1.2.3");
    expect(models.activeModel).toBe("gpt-5");
    expect(mcp.servers[0]?.name).toBe("filesystem");
  });
});
