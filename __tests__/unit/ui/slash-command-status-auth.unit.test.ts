import { CURSOR_AUTH_GUIDANCE } from "@/constants/cursor-auth-guidance";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import type { SlashCommandDeps } from "@/ui/components/chat/slash-command-runner";
import {
  appendStatusAuthGuidance,
  isStatusAuthFailureResult,
  toStatusAuthState,
} from "@/ui/components/chat/slash-command-status-auth";
import { describe, expect, it, vi } from "vitest";

const createDeps = (
  overrides: Partial<SlashCommandDeps> = {}
): { deps: SlashCommandDeps; appendSystemMessage: ReturnType<typeof vi.fn> } => {
  const appendSystemMessage = vi.fn();
  const deps: SlashCommandDeps = {
    appendSystemMessage,
    getSession: () => undefined,
    getMessagesForSession: () => [],
    getPlanBySession: () => undefined,
    listSessions: () => [],
    upsertSession: () => {},
    clearMessagesForSession: () => {},
    upsertPlan: () => {},
    ...overrides,
  };
  return { deps, appendSystemMessage };
};

describe("slash-command-status-auth", () => {
  describe("toStatusAuthState", () => {
    it("returns true for authenticated yes values", () => {
      expect(toStatusAuthState({ Authenticated: "yes" })).toBe(true);
      expect(toStatusAuthState({ authenticated: " YES " })).toBe(true);
    });

    it("returns false for authenticated no values", () => {
      expect(toStatusAuthState({ Authenticated: "no" })).toBe(false);
      expect(toStatusAuthState({ authenticated: " NO " })).toBe(false);
    });

    it("returns undefined when auth key missing or unknown", () => {
      expect(toStatusAuthState({ model: "auto" })).toBeUndefined();
      expect(toStatusAuthState({ authenticated: "maybe" })).toBeUndefined();
    });
  });

  describe("appendStatusAuthGuidance", () => {
    it("uses cursor-specific guidance for cursor harness", () => {
      const { deps, appendSystemMessage } = createDeps({
        activeHarnessId: HARNESS_DEFAULT.CURSOR_CLI_ID,
      });

      appendStatusAuthGuidance(deps);

      expect(appendSystemMessage).toHaveBeenCalledWith(CURSOR_AUTH_GUIDANCE.LOGIN_REQUIRED);
    });

    it("uses gemini-specific guidance for gemini harness", () => {
      const { deps, appendSystemMessage } = createDeps({
        activeHarnessId: HARNESS_DEFAULT.GEMINI_CLI_ID,
      });

      appendStatusAuthGuidance(deps);

      expect(appendSystemMessage).toHaveBeenCalledWith(SLASH_COMMAND_MESSAGE.GEMINI_LOGIN_HINT);
    });

    it("uses generic guidance for non-cursor non-gemini harnesses", () => {
      const { deps, appendSystemMessage } = createDeps({
        activeHarnessId: HARNESS_DEFAULT.CODEX_CLI_ID,
      });

      appendStatusAuthGuidance(deps);

      expect(appendSystemMessage).toHaveBeenCalledWith(
        SLASH_COMMAND_MESSAGE.AUTH_REQUIRED_LOGIN_HINT
      );
    });
  });

  describe("isStatusAuthFailureResult", () => {
    it("returns true for auth-related failures in stdout or stderr", () => {
      expect(
        isStatusAuthFailureResult({
          stdout: "not authenticated",
          stderr: "",
          exitCode: 1,
        })
      ).toBe(true);
      expect(
        isStatusAuthFailureResult({
          stdout: "",
          stderr: "Request failed with status 401",
          exitCode: 1,
        })
      ).toBe(true);
    });

    it("returns false for non-auth failure output", () => {
      expect(
        isStatusAuthFailureResult({
          stdout: "",
          stderr: "network timeout",
          exitCode: 1,
        })
      ).toBe(false);
    });
  });
});
