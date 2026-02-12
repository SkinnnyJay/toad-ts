import {
  CLOUD_DEFAULT_LIST_LIMIT,
  parseCloudListArgs,
  toErrorMessage,
  toHarnessCommand,
} from "@/ui/components/chat/agent-management-command-helpers";
import { describe, expect, it } from "vitest";

describe("agent-management-command-helpers", () => {
  it("parses cloud list args with explicit limit and cursor", () => {
    const parsed = parseCloudListArgs(["25", "cursor-1"]);
    expect(parsed).toEqual({ limit: 25, cursor: "cursor-1" });
  });

  it("falls back to default limit when first arg is cursor token", () => {
    const parsed = parseCloudListArgs(["cursor-2"]);
    expect(parsed).toEqual({
      limit: CLOUD_DEFAULT_LIST_LIMIT,
      cursor: "cursor-2",
    });
  });

  it("uses default limit when numeric limit is non-positive", () => {
    const parsed = parseCloudListArgs(["0", "cursor-3"]);
    expect(parsed).toEqual({
      limit: CLOUD_DEFAULT_LIST_LIMIT,
      cursor: "cursor-3",
    });
  });

  it("formats unknown and Error values for display", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
    expect(toErrorMessage("plain-text")).toBe("plain-text");
  });

  it("builds harness command strings without double spaces", () => {
    expect(toHarnessCommand("cursor-agent", [], "logout")).toBe("cursor-agent logout");
    expect(toHarnessCommand("codex", ["--profile", "dev"], "login")).toBe(
      "codex --profile dev login"
    );
  });
});
