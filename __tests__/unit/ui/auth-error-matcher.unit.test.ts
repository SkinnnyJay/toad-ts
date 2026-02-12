import {
  hasCursorApiKeyHint,
  isAuthFailureMessage,
  toErrorMessage,
} from "@/ui/utils/auth-error-matcher";
import { describe, expect, it } from "vitest";

describe("auth-error-matcher", () => {
  it("matches explicit authentication failure phrases", () => {
    expect(isAuthFailureMessage("Request failed with status 401")).toBe(true);
    expect(isAuthFailureMessage("status 403 forbidden")).toBe(true);
    expect(isAuthFailureMessage("login required")).toBe(true);
  });

  it("matches generic authentication term only when enabled", () => {
    expect(isAuthFailureMessage("authentication token expired")).toBe(false);
    expect(
      isAuthFailureMessage("authentication token expired", {
        includeGenericAuthenticationTerm: true,
      })
    ).toBe(true);
  });

  it("matches cursor api key hints only when enabled", () => {
    expect(isAuthFailureMessage("Missing CURSOR_API_KEY for cloud requests")).toBe(false);
    expect(
      isAuthFailureMessage("Missing CURSOR_API_KEY for cloud requests", {
        includeCursorApiKeyHint: true,
      })
    ).toBe(true);
  });

  it("returns false for non-auth text", () => {
    expect(isAuthFailureMessage("network timeout")).toBe(false);
  });

  it("detects explicit cursor api key mentions", () => {
    expect(hasCursorApiKeyHint("Missing CURSOR_API_KEY for cloud requests")).toBe(true);
    expect(hasCursorApiKeyHint("network timeout")).toBe(false);
  });

  it("extracts error messages from standard error-like values", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
    expect(toErrorMessage("plain text error")).toBe("plain text error");
    expect(toErrorMessage({ message: "object message" })).toBe("object message");
    expect(toErrorMessage({ message: 42 })).toBeUndefined();
    expect(toErrorMessage(undefined)).toBeUndefined();
  });
});
