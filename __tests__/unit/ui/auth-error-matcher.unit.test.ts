import { isAuthFailureMessage } from "@/ui/utils/auth-error-matcher";
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
});
