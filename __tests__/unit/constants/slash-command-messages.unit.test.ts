import { LIMIT } from "@/config/limits";
import {
  SLASH_COMMAND_MESSAGE,
  formatAgentSessionListMessage,
} from "@/constants/slash-command-messages";
import { describe, expect, it } from "vitest";

describe("slash command message formatters", () => {
  it("exports auth guidance messages for status and cloud failures", () => {
    expect(SLASH_COMMAND_MESSAGE.AUTH_REQUIRED_LOGIN_HINT).toBe(
      "Authentication required. Run /login for the active provider."
    );
    expect(SLASH_COMMAND_MESSAGE.CLOUD_AUTH_REQUIRED).toContain("cursor-agent login");
  });

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

  it("orders native sessions by newest created timestamp first", () => {
    const message = formatAgentSessionListMessage([
      {
        id: "session-oldest",
        createdAt: "2026-02-10T10:00:00.000Z",
      },
      {
        id: "session-newest",
        createdAt: "2026-02-11T10:00:00.000Z",
      },
      {
        id: "session-middle",
        createdAt: "2026-02-10T22:00:00.000Z",
      },
    ]);

    const newestIndex = message.indexOf("session-newest");
    const middleIndex = message.indexOf("session-middle");
    const oldestIndex = message.indexOf("session-oldest");

    expect(newestIndex).toBeGreaterThanOrEqual(0);
    expect(middleIndex).toBeGreaterThanOrEqual(0);
    expect(oldestIndex).toBeGreaterThanOrEqual(0);
    expect(newestIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(oldestIndex);
  });

  it("deduplicates duplicate native session ids before rendering", () => {
    const sessionId = "session-duplicate";
    const message = formatAgentSessionListMessage([
      { id: sessionId, title: "Old", messageCount: 1 },
      {
        id: sessionId,
        title: "Recovered title",
        model: "gpt-5",
        messageCount: 14,
        createdAt: "2026-02-11T18:30:00.000Z",
      },
    ]);

    expect(message.indexOf(sessionId)).toBeGreaterThanOrEqual(0);
    expect(message.lastIndexOf(sessionId)).toBe(message.indexOf(sessionId));
    expect(message).toContain("Recovered title");
    expect(message).toContain("model: gpt-5");
    expect(message).toContain("messages: 14");
  });
});
