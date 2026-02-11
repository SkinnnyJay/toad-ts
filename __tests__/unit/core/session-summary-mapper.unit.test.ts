import {
  toAgentManagementSession,
  toAgentManagementSessions,
} from "@/core/agent-management/session-summary-mapper";
import { describe, expect, it } from "vitest";

describe("session-summary-mapper", () => {
  it("maps a cli session summary to agent-management session", () => {
    const mapped = toAgentManagementSession({
      id: "session-1",
      title: "Session title",
      createdAt: "2026-02-11T18:30:00.000Z",
      model: "gpt-5",
      messageCount: 14,
    });

    expect(mapped).toEqual({
      id: "session-1",
      title: "Session title",
      createdAt: "2026-02-11T18:30:00.000Z",
      model: "gpt-5",
      messageCount: 14,
    });
  });

  it("maps lists of cli session summaries", () => {
    const mapped = toAgentManagementSessions([
      {
        id: "session-1",
      },
      {
        id: "session-2",
        title: "Second session",
      },
    ]);

    expect(mapped).toEqual([
      { id: "session-1" },
      {
        id: "session-2",
        title: "Second session",
      },
    ]);
  });
});
