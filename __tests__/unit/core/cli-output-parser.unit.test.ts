import { describe, expect, it } from "vitest";
import {
  extractFirstUuid,
  parseAuthStatusOutput,
  parseKeyValueLines,
  parseModelsOutput,
  parseSessionListOutput,
  parseSessionSummariesOutput,
  parseUuidLines,
} from "../../../src/core/agent-management/cli-output-parser";

describe("cli-output-parser", () => {
  it("parses auth status output with email", () => {
    const parsed = parseAuthStatusOutput("Logged in as test@example.com");
    expect(parsed.authenticated).toBe(true);
    expect(parsed.email).toBe("test@example.com");
  });

  it("parses key-value auth status output", () => {
    const parsed = parseAuthStatusOutput("Authenticated: true\nEmail: kv@example.com");
    expect(parsed.authenticated).toBe(true);
    expect(parsed.email).toBe("kv@example.com");
  });

  it("parses unauthenticated key-value status output", () => {
    const parsed = parseAuthStatusOutput("authenticated = false");
    expect(parsed.authenticated).toBe(false);
    expect(parsed.email).toBeUndefined();
  });

  it("parses status-token auth output variants", () => {
    const authenticatedParsed = parseAuthStatusOutput(
      "status: logged-in\nemail: status-user@example.com"
    );
    const unauthenticatedParsed = parseAuthStatusOutput("authentication status=unauthenticated");

    expect(authenticatedParsed).toEqual({
      authenticated: true,
      method: "browser_login",
      email: "status-user@example.com",
    });
    expect(unauthenticatedParsed).toEqual({
      authenticated: false,
      method: "none",
    });
  });

  it("parses authenticated-as phrase output", () => {
    const parsed = parseAuthStatusOutput("You are authenticated as phrase-user@example.com");

    expect(parsed).toEqual({
      authenticated: true,
      method: "browser_login",
      email: "phrase-user@example.com",
    });
  });

  it("parses model list output and default model flag", () => {
    const parsed = parseModelsOutput(
      "auto - Auto\nopus-4.6-thinking - Claude 4.6 Opus (Thinking) (default)"
    );
    expect(parsed.models).toHaveLength(2);
    expect(parsed.models[1]?.name).toBe("Claude 4.6 Opus (Thinking)");
    expect(parsed.defaultModel).toBe("opus-4.6-thinking");
  });

  it("normalizes model names with current/default marker variants", () => {
    const parsed = parseModelsOutput(
      [
        "gpt-4o - GPT-4o (current)",
        "gpt-5 - GPT-5 (default)",
        "opus-4.6-thinking - Claude 4.6 Opus (Thinking) (current default)",
      ].join("\n")
    );

    expect(parsed.models).toEqual([
      {
        id: "gpt-4o",
        name: "GPT-4o",
        isDefault: true,
        supportsThinking: false,
      },
      {
        id: "gpt-5",
        name: "GPT-5",
        isDefault: true,
        supportsThinking: false,
      },
      {
        id: "opus-4.6-thinking",
        name: "Claude 4.6 Opus (Thinking)",
        isDefault: true,
        supportsThinking: true,
      },
    ]);
  });

  it("does not flag non-state parenthetical model text as default", () => {
    const parsed = parseModelsOutput(
      ["sherlock - Sherlock (default strategy)", "watson - Watson (current)"].join("\n")
    );

    expect(parsed.models).toEqual([
      {
        id: "sherlock",
        name: "Sherlock (default strategy)",
        isDefault: false,
        supportsThinking: false,
      },
      {
        id: "watson",
        name: "Watson",
        isDefault: true,
        supportsThinking: false,
      },
    ]);
    expect(parsed.defaultModel).toBe("watson");
  });

  it("parses bulleted model lines", () => {
    const parsed = parseModelsOutput(["- gpt-5 - GPT-5 (default)", "* gpt-4o - GPT-4o"].join("\n"));

    expect(parsed.models).toEqual([
      {
        id: "gpt-5",
        name: "GPT-5",
        isDefault: true,
        supportsThinking: false,
      },
      {
        id: "gpt-4o",
        name: "GPT-4o",
        isDefault: false,
        supportsThinking: false,
      },
    ]);
    expect(parsed.defaultModel).toBe("gpt-5");
  });

  it("extracts UUID values from output lines", () => {
    const output = [
      "session: 03db60d8-ec0a-4376-aa2b-d89acc9b4abc",
      "8ecde8d5-e5be-4191-b88d-bd9dc1908f8f",
    ].join("\n");
    expect(extractFirstUuid(output)).toBe("03db60d8-ec0a-4376-aa2b-d89acc9b4abc");
    expect(parseUuidLines(output)).toEqual([
      "03db60d8-ec0a-4376-aa2b-d89acc9b4abc",
      "8ecde8d5-e5be-4191-b88d-bd9dc1908f8f",
    ]);
  });

  it("parses session list output with uuid and non-uuid ids", () => {
    const output = [
      "03db60d8-ec0a-4376-aa2b-d89acc9b4abc Active session",
      "session-resume-id Native resume session",
      "session_resume_id Another resume session",
      "03db60d8-ec0a-4376-aa2b-d89acc9b4abc Active session",
    ].join("\n");

    expect(parseSessionListOutput(output)).toEqual([
      "03db60d8-ec0a-4376-aa2b-d89acc9b4abc",
      "session-resume-id",
      "session_resume_id",
    ]);
    expect(parseSessionSummariesOutput(output)).toEqual([
      {
        id: "03db60d8-ec0a-4376-aa2b-d89acc9b4abc",
        title: "Active session",
      },
      {
        id: "session-resume-id",
        title: "Native resume session",
      },
      {
        id: "session_resume_id",
        title: "Another resume session",
      },
    ]);
  });

  it("parses session metadata details when present", () => {
    const output = [
      "session-resume-id Native resume session model: gpt-5 messages: 14 created: 2026-02-11T18:30:00Z",
      "another-session-id model gpt-4o 2 messages createdAt=2026-02-10T08:00:00+00:00",
      "session-resume-id Native resume session",
    ].join("\n");

    expect(parseSessionSummariesOutput(output)).toEqual([
      {
        id: "session-resume-id",
        title: "Native resume session",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
      {
        id: "another-session-id",
        createdAt: "2026-02-10T08:00:00.000Z",
        model: "gpt-4o",
        messageCount: 2,
      },
    ]);
  });

  it("merges duplicate session rows with richer metadata", () => {
    const output = [
      "session-resume-id Old title model: gpt-5 messages: 1 createdAt=2026-02-10T08:00:00+00:00",
      "session-resume-id Newer richer title model: gpt-5 messages: 14 createdAt=2026-02-11T08:00:00+00:00",
    ].join("\n");

    expect(parseSessionSummariesOutput(output)).toEqual([
      {
        id: "session-resume-id",
        title: "Newer richer title",
        createdAt: "2026-02-11T08:00:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
    ]);
  });

  it("ignores warning lines with non-leading session-like ids", () => {
    const output = [
      "warning: cached metadata for session session-noise-id",
      "session-real-id Real resume session",
    ].join("\n");

    expect(parseSessionSummariesOutput(output)).toEqual([
      {
        id: "session-real-id",
        title: "Real resume session",
      },
    ]);
  });

  it("parses leading labeled and bulleted session lines", () => {
    const output = [
      "session_id: session-primary-id Primary title",
      "- session-fallback-id Backup title",
    ].join("\n");

    expect(parseSessionSummariesOutput(output)).toEqual([
      {
        id: "session-primary-id",
        title: "Primary title",
      },
      {
        id: "session-fallback-id",
        title: "Backup title",
      },
    ]);
  });

  it("ignores leading ISO timestamp tokens when extracting session ids", () => {
    const output = [
      "2026-02-11T08:00:00Z warning: sessions emitted to stderr",
      "session-real-id Real resume session",
    ].join("\n");

    expect(parseSessionSummariesOutput(output)).toEqual([
      {
        id: "session-real-id",
        title: "Real resume session",
      },
    ]);
  });

  it("returns empty session list when CLI requires a tty", () => {
    expect(
      parseSessionListOutput("Requires TTY; use session_id from NDJSON system.init instead.")
    ).toEqual([]);
  });

  it("parses key-value style output", () => {
    const parsed = parseKeyValueLines("Model: Claude 4.6\nOS: linux");
    expect(parsed).toEqual({
      Model: "Claude 4.6",
      OS: "linux",
    });
  });

  it("parses key-value output with equals separator", () => {
    const parsed = parseKeyValueLines("Model = Claude 4.6\nOS=linux");
    expect(parsed).toEqual({
      Model: "Claude 4.6",
      OS: "linux",
    });
  });
});
