import {
  formatAboutResult,
  formatLoginResult,
  formatMcpList,
  formatModelsResult,
  formatStatusResult,
} from "@/ui/formatters/agent-command-formatter";
import { describe, expect, it } from "vitest";

describe("agent-command-formatter", () => {
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
});
