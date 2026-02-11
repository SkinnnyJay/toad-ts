import { describe, expect, it } from "vitest";
import {
  extractFirstUuid,
  parseAuthStatusOutput,
  parseKeyValueLines,
  parseModelsOutput,
  parseUuidLines,
} from "../../../src/core/agent-management/cli-output-parser";

describe("cli-output-parser", () => {
  it("parses auth status output with email", () => {
    const parsed = parseAuthStatusOutput("Logged in as test@example.com");
    expect(parsed.authenticated).toBe(true);
    expect(parsed.email).toBe("test@example.com");
  });

  it("parses model list output and default model flag", () => {
    const parsed = parseModelsOutput(
      "auto - Auto\nopus-4.6-thinking - Claude 4.6 Opus (Thinking) (default)"
    );
    expect(parsed.models).toHaveLength(2);
    expect(parsed.defaultModel).toBe("opus-4.6-thinking");
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

  it("parses key-value style output", () => {
    const parsed = parseKeyValueLines("Model: Claude 4.6\nOS: linux");
    expect(parsed).toEqual({
      Model: "Claude 4.6",
      OS: "linux",
    });
  });
});
