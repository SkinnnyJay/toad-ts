import {
  sortAgentManagementSessionsByRecency,
  toAgentManagementSession,
  toAgentManagementSessions,
  toNormalizedAgentManagementSessions,
  toUniqueAgentManagementSessions,
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

  it("deduplicates and merges agent-management sessions by id", () => {
    const uniqueSessions = toUniqueAgentManagementSessions([
      {
        id: "session-1",
        title: "Old",
        createdAt: "2026-02-10T18:30:00.000Z",
        messageCount: 1,
      },
      {
        id: "session-1",
        title: "Recovered title",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
      {
        id: "session-2",
        title: "Second session",
      },
      {
        id: "session-2",
        createdAt: "2026-02-11T18:30:00.000Z",
      },
    ]);

    expect(uniqueSessions).toEqual([
      {
        id: "session-1",
        title: "Recovered title",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
      {
        id: "session-2",
        title: "Second session",
        createdAt: "2026-02-11T18:30:00.000Z",
      },
    ]);
  });

  it("normalizes and deduplicates ids with surrounding whitespace", () => {
    const uniqueSessions = toUniqueAgentManagementSessions([
      { id: "  session-1  ", title: "Recovered title" },
      { id: "session-1", model: "gpt-5", messageCount: 14 },
      { id: "   " },
    ]);

    expect(uniqueSessions).toEqual([
      {
        id: "session-1",
        title: "Recovered title",
        model: "gpt-5",
        messageCount: 14,
      },
    ]);
  });

  it("normalizes session model metadata when deduplicating", () => {
    const uniqueSessions = toUniqueAgentManagementSessions([
      { id: "session-1", model: "   " },
      { id: "session-1", model: "  gpt-5  " },
    ]);

    expect(uniqueSessions).toEqual([
      {
        id: "session-1",
        model: "gpt-5",
      },
    ]);
  });

  it("sorts sessions by newest created timestamp while preserving ties", () => {
    const sortedSessions = sortAgentManagementSessionsByRecency([
      { id: "session-1", createdAt: "2026-02-10T18:30:00.000Z" },
      { id: "session-2" },
      { id: "session-3", createdAt: "2026-02-11T18:30:00.000Z" },
      { id: "session-4", createdAt: "2026-02-11T18:30:00.000Z" },
    ]);

    expect(sortedSessions.map((session) => session.id)).toEqual([
      "session-3",
      "session-4",
      "session-1",
      "session-2",
    ]);
  });

  it("sorts invalid created timestamps after valid timestamps", () => {
    const sortedSessions = sortAgentManagementSessionsByRecency([
      { id: "session-valid", createdAt: "2026-02-11T18:30:00.000Z" },
      { id: "session-invalid", createdAt: "not-a-date" },
      { id: "session-missing" },
    ]);

    expect(sortedSessions.map((session) => session.id)).toEqual([
      "session-valid",
      "session-invalid",
      "session-missing",
    ]);
  });

  it("normalizes sessions with dedupe and newest-first ordering", () => {
    const normalizedSessions = toNormalizedAgentManagementSessions([
      { id: " session-old ", title: "Old", createdAt: "2026-02-10T18:30:00.000Z" },
      { id: "session-new", title: "New", createdAt: "2026-02-11T18:30:00.000Z" },
      { id: "session-new", messageCount: 12, model: "gpt-5" },
      { id: "   " },
    ]);

    expect(normalizedSessions).toEqual([
      {
        id: "session-new",
        title: "New",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 12,
      },
      {
        id: "session-old",
        title: "Old",
        createdAt: "2026-02-10T18:30:00.000Z",
      },
    ]);
  });
});
