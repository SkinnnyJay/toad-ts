import { LIMIT } from "@/config/limits";
import { formatAgentSessionListMessage } from "@/constants/slash-command-messages";
import { describe, expect, it } from "vitest";

describe("slash command message formatters", () => {
  it("formats native agent sessions with metadata details", () => {
    const message = formatAgentSessionListMessage([
      {
        id: "session-1",
        title: "Fix flaky test",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
    ]);

    expect(message).toContain("Agent sessions:");
    expect(message).toContain("session-1 (Fix flaky test · created: 2026-02-11T18:30:00.000Z");
    expect(message).toContain("model: gpt-5");
    expect(message).toContain("messages: 14");
  });

  it("limits native session preview output", () => {
    const sessions = Array.from({ length: LIMIT.SESSION_LIST_PREVIEW + 1 }, (_, index) => ({
      id: `session-${index + 1}`,
    }));
    const message = formatAgentSessionListMessage(sessions);

    expect(message).toContain("… 1 more agent sessions");
    expect(message).not.toContain(`session-${LIMIT.SESSION_LIST_PREVIEW + 1}`);
  });
});
