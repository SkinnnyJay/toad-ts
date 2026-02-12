import { readFileSync } from "node:fs";
import path from "node:path";
import {
  parseCursorModelsOutput,
  parseCursorStatusOutput,
} from "@/core/cursor/cursor-command-parsers";
import { describe, expect, it } from "vitest";

describe("cursor-command-parsers", () => {
  it("parses models output fixture", () => {
    const output = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/models-output.txt"),
      "utf8"
    );
    const parsed = parseCursorModelsOutput(output);

    expect(parsed.models.length).toBeGreaterThan(0);
    expect(parsed.defaultModel).toBe("opus-4.6-thinking");
    expect(parsed.currentModel).toBe("opus-4.6-thinking");
  });

  it("parses status output fixture with browser auth", () => {
    const output = readFileSync(
      path.join(process.cwd(), "__tests__/fixtures/cursor/status-output.txt"),
      "utf8"
    );
    const parsed = parseCursorStatusOutput(output, "", undefined);

    expect(parsed.authenticated).toBe(true);
    expect(parsed.method).toBe("browser_login");
    expect(parsed.email).toBe("netwearcdz@gmail.com");
  });

  it("marks auth valid when api key is configured", () => {
    const parsed = parseCursorStatusOutput("No login output", "", "token-123");
    expect(parsed.authenticated).toBe(true);
    expect(parsed.method).toBe("api_key");
  });
});
