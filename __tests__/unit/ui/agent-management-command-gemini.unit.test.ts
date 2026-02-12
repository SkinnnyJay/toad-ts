import { harnessConfigSchema } from "@/harness/harnessConfig";
import { resolveGeminiStatusLines } from "@/ui/components/chat/agent-management-command-gemini";
import { describe, expect, it, vi } from "vitest";

describe("agent-management-command-gemini", () => {
  it("returns base gemini status lines when session listing fails", async () => {
    const harness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        GOOGLE_API_KEY: "google-key",
      },
    });
    const runCommand = vi.fn(async () => {
      throw new Error("gemini unavailable");
    });

    const lines = await resolveGeminiStatusLines(harness, runCommand);

    expect(lines[0]).toContain("Authenticated: yes");
    expect(lines[2]).toContain("GOOGLE_API_KEY");
  });

  it("appends sessions line when list-sessions succeeds", async () => {
    const harness = harnessConfigSchema.parse({
      id: "gemini-cli",
      name: "Gemini CLI",
      command: "gemini",
      args: [],
      env: {
        GEMINI_API_KEY: "gemini-key",
      },
    });
    const runCommand = vi.fn(async () => ({
      stdout: "1. sess-a\n2. sess-b",
      stderr: "",
      exitCode: 0,
    }));

    const lines = await resolveGeminiStatusLines(harness, runCommand);

    expect(lines).toContain("Sessions: 2");
  });
});
