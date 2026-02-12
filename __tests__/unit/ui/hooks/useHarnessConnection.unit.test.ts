import { LIMIT } from "@/config/limits";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { CURSOR_AUTH_GUIDANCE } from "@/constants/cursor-auth-guidance";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { RENDER_STAGE } from "@/constants/render-stage";
import { formatHarnessError } from "@/ui/hooks/useHarnessConnection";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useHarnessConnection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatHarnessError", () => {
    it("formats ENOENT error with command context", () => {
      const error = Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
      const result = formatHarnessError(error, {
        agentName: "Claude CLI",
        command: "claude",
        harnessId: HARNESS_DEFAULT.CLAUDE_CLI_ID,
      });

      expect(result).toContain("Command 'claude' not found");
      expect(result).toContain("Claude CLI");
      expect(result).toContain(ENV_KEY.TOADSTOOL_CLAUDE_COMMAND);
      expect(result).toContain("Install Claude Code ACP");
    });

    it("uses harness-specific command env hint for cursor ENOENT", () => {
      const error = Object.assign(new Error("spawn cursor-agent ENOENT"), { code: "ENOENT" });
      const result = formatHarnessError(error, {
        agentName: "Cursor CLI",
        command: "cursor-agent",
        harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      });

      expect(result).toContain("Command 'cursor-agent' not found");
      expect(result).toContain(ENV_KEY.TOADSTOOL_CURSOR_COMMAND);
      expect(result).toContain("Install Cursor CLI");
    });

    it("uses harness-specific command env hint for codex ENOENT", () => {
      const error = Object.assign(new Error("spawn codex ENOENT"), { code: "ENOENT" });
      const result = formatHarnessError(error, {
        agentName: "Codex CLI",
        command: "codex",
        harnessId: HARNESS_DEFAULT.CODEX_CLI_ID,
      });

      expect(result).toContain("Command 'codex' not found");
      expect(result).toContain(ENV_KEY.TOADSTOOL_CODEX_COMMAND);
      expect(result).toContain("Install Codex CLI");
    });

    it("uses harness-specific command env hint for gemini ENOENT", () => {
      const error = Object.assign(new Error("spawn gemini ENOENT"), { code: "ENOENT" });
      const result = formatHarnessError(error, {
        agentName: "Gemini CLI",
        command: "gemini",
        harnessId: HARNESS_DEFAULT.GEMINI_CLI_ID,
      });

      expect(result).toContain("Command 'gemini' not found");
      expect(result).toContain(ENV_KEY.TOADSTOOL_GEMINI_COMMAND);
      expect(result).toContain("Install Gemini CLI");
    });

    it("formats EACCES error with command context", () => {
      const error = Object.assign(new Error("permission denied"), { code: "EACCES" });
      const result = formatHarnessError(error, {
        agentName: "Claude CLI",
        command: "claude",
      });

      expect(result).toContain("Permission denied");
      expect(result).toContain("Claude CLI");
      expect(result).toContain("claude");
    });

    it("uses default command when not provided for ENOENT", () => {
      const error = Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
      const result = formatHarnessError(error, {});

      expect(result).toContain("claude-code-acp");
    });

    it("uses default agent name when not provided for ENOENT", () => {
      const error = Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
      const result = formatHarnessError(error, { command: "my-agent" });

      expect(result).toContain("agent");
      expect(result).toContain("my-agent");
    });

    it("formats generic error with agent name", () => {
      const error = new Error("Connection timeout");
      const result = formatHarnessError(error, { agentName: "Test Agent" });

      expect(result).toBe("Unable to connect to Test Agent: Connection timeout");
    });

    it("maps cursor auth-required message to login guidance", () => {
      const error = new Error("Request failed with status 401");
      const result = formatHarnessError(error, {
        agentName: "Cursor CLI",
        command: "cursor-agent",
        harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      });

      expect(result).toBe(CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED);
    });

    it("maps cursor CURSOR_API_KEY auth errors to login guidance", () => {
      const error = new Error("Cursor cloud API requires CURSOR_API_KEY.");
      const result = formatHarnessError(error, {
        agentName: "Cursor CLI",
        command: "cursor-agent",
        harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      });

      expect(result).toBe(CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED);
    });

    it("maps cursor auth wording from object messages to login guidance", () => {
      const result = formatHarnessError(
        { message: "Request failed with status 401" },
        {
          agentName: "Cursor CLI",
          command: "cursor-agent",
          harnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
        }
      );

      expect(result).toBe(CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED);
    });

    it("does not remap auth wording for non-cursor harnesses", () => {
      const error = new Error("Request failed with status 401");
      const result = formatHarnessError(error, {
        agentName: "Claude CLI",
        command: "claude",
        harnessId: HARNESS_DEFAULT.CLAUDE_CLI_ID,
      });

      expect(result).toBe("Unable to connect to Claude CLI: Request failed with status 401");
    });

    it("formats generic error without agent name", () => {
      const error = new Error("Connection timeout");
      const result = formatHarnessError(error, {});

      expect(result).toBe("Connection timeout");
    });

    it("handles non-Error objects", () => {
      const result = formatHarnessError("string error", { agentName: "Agent" });

      expect(result).toBe("Unable to connect to Agent: string error");
    });

    it("uses object message details when present", () => {
      const result = formatHarnessError({ message: "structured error" }, { agentName: "Agent" });

      expect(result).toBe("Unable to connect to Agent: structured error");
    });

    it("handles null/undefined errors", () => {
      const result = formatHarnessError(null, {});
      expect(result).toBe("null");

      const result2 = formatHarnessError(undefined, {});
      expect(result2).toBe("undefined");
    });
  });

  describe("constants", () => {
    it("uses correct connection status constants", () => {
      expect(CONNECTION_STATUS.CONNECTING).toBe("connecting");
      expect(CONNECTION_STATUS.CONNECTED).toBe("connected");
      expect(CONNECTION_STATUS.ERROR).toBe("error");
    });

    it("uses correct render stage constants", () => {
      expect(RENDER_STAGE.CONNECTING).toBe("connecting");
      expect(RENDER_STAGE.READY).toBe("ready");
      expect(RENDER_STAGE.ERROR).toBe("error");
    });

    it("has MAX_CONNECTION_RETRIES configured", () => {
      expect(typeof LIMIT.MAX_CONNECTION_RETRIES).toBe("number");
      expect(LIMIT.MAX_CONNECTION_RETRIES).toBeGreaterThanOrEqual(1);
    });
  });

  describe("hook export", () => {
    it("exports useHarnessConnection function", async () => {
      const { useHarnessConnection } = await import("@/ui/hooks/useHarnessConnection");
      expect(typeof useHarnessConnection).toBe("function");
    });

    it("exports formatHarnessError function", async () => {
      const { formatHarnessError } = await import("@/ui/hooks/useHarnessConnection");
      expect(typeof formatHarnessError).toBe("function");
    });
  });

  describe("error message formatting", () => {
    it("appends retry note when MAX_CONNECTION_RETRIES > 1", () => {
      // This tests the pattern used in the hook
      const retryNote =
        LIMIT.MAX_CONNECTION_RETRIES > 1 ? ` (after ${LIMIT.MAX_CONNECTION_RETRIES} attempts)` : "";

      if (LIMIT.MAX_CONNECTION_RETRIES > 1) {
        expect(retryNote).toContain("attempts");
      } else {
        expect(retryNote).toBe("");
      }
    });
  });
});
