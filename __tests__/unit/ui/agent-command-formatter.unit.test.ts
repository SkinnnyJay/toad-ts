import {
  formatAboutResult,
  formatLoginResult,
  formatLogoutResult,
  formatMcpList,
  formatModelsResult,
  formatStatusResult,
} from "@/ui/formatters/agent-command-formatter";
import { describe, expect, it } from "vitest";

describe("agent-command-formatter", () => {
  it("formats unsupported login and fallback-available login results", () => {
    expect(formatLoginResult({ supported: false }, "Codex CLI")).toEqual([
      "Codex CLI: login is not supported.",
    ]);
    expect(formatLoginResult({ supported: true }, "Codex CLI")).toEqual([
      "Codex CLI: login is available.",
    ]);
  });

  it("formats login results with browser hint", () => {
    const lines = formatLoginResult(
      {
        supported: true,
        command: "cursor-agent login",
        requiresBrowser: true,
      },
      "Cursor CLI"
    );

    expect(lines[0]).toContain("cursor-agent login");
    expect(lines[1]).toContain("browser");
  });

  it("formats status result fields in stable order", () => {
    const lines = formatStatusResult({
      supported: true,
      authenticated: true,
      email: "dev@example.com",
      method: "api_key",
      version: "1.0.0",
      model: "gpt-5",
      message: "Authenticated as dev@example.com",
    });

    expect(lines).toEqual([
      "Authenticated: yes",
      "Email: dev@example.com",
      "Method: api_key",
      "Version: 1.0.0",
      "Model: gpt-5",
      "Status: Authenticated as dev@example.com",
    ]);
  });

  it("formats unsupported and empty status results", () => {
    expect(formatStatusResult({ supported: false })).toEqual(["Status command is not supported."]);
    expect(formatStatusResult({ supported: true })).toEqual(["Status command produced no output."]);
  });

  it("formats mcp server rows with reason suffix", () => {
    const lines = formatMcpList(
      [
        { name: "filesystem", status: "connected" },
        { name: "memory", status: "disabled", reason: "missing token" },
      ],
      "Cursor CLI"
    );

    expect(lines).toEqual(["- filesystem: connected", "- memory: disabled (missing token)"]);
  });

  it("formats empty mcp server list results", () => {
    expect(formatMcpList([], "Cursor CLI")).toEqual(["No MCP servers returned by Cursor CLI."]);
  });

  it("formats logout result with stable message ordering", () => {
    const lines = formatLogoutResult(
      {
        supported: true,
        loggedOut: true,
        command: "cursor-agent logout",
        message: "Logged out successfully",
      },
      "Cursor CLI"
    );

    expect(lines).toEqual([
      "Logged out: yes",
      "Command: cursor-agent logout",
      "Logged out successfully",
    ]);
  });

  it("formats models results with active model footer", () => {
    const lines = formatModelsResult(
      {
        supported: true,
        models: ["gpt-5", "claude-sonnet-4"],
        activeModel: "gpt-5",
      },
      "Cursor CLI"
    );

    expect(lines).toEqual(["- gpt-5", "- claude-sonnet-4", "Active model: gpt-5"]);
  });

  it("formats unsupported and empty models results", () => {
    expect(formatModelsResult({ supported: false, models: [] }, "Codex CLI")).toEqual([
      "Codex CLI: model listing is not supported.",
    ]);
    expect(formatModelsResult({ supported: true, models: [] }, "Codex CLI")).toEqual([
      "No models returned by Codex CLI.",
    ]);
    expect(
      formatModelsResult(
        { supported: true, models: [], message: "Model list unavailable in non-interactive mode." },
        "Codex CLI"
      )
    ).toEqual(["Model list unavailable in non-interactive mode."]);
  });

  it("formats about results with structured output", () => {
    const lines = formatAboutResult(
      {
        supported: true,
        version: "1.2.3",
        os: "linux",
        shell: "bash",
      },
      "Codex CLI"
    );

    expect(lines).toEqual(["Version: 1.2.3", "OS: linux", "Shell: bash"]);
  });

  it("formats unsupported and empty about results", () => {
    expect(formatAboutResult({ supported: false }, "Gemini CLI")).toEqual([
      "Gemini CLI: about is not supported.",
    ]);
    expect(formatAboutResult({ supported: true }, "Gemini CLI")).toEqual([
      "No about output returned by Gemini CLI.",
    ]);
  });

  it("formats unsupported logout results", () => {
    expect(formatLogoutResult({ supported: false, loggedOut: false }, "Gemini CLI")).toEqual([
      "Gemini CLI: logout is not supported.",
    ]);
  });
});
