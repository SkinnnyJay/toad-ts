import type { AgentInfo } from "@/agents/agent-manager";
import { SESSION_MODE } from "@/constants/session-modes";
import { AgentIdSchema, type Session, SessionIdSchema } from "@/types/domain";
import { describe, expect, it, vi } from "vitest";
import { switchToSessionWithFallback } from "../../../src/ui/utils/session-switcher";

const createAgent = (): AgentInfo => ({
  id: AgentIdSchema.parse("cursor-cli"),
  harnessId: "cursor-cli",
  name: "Cursor Agent",
  model: "gpt-5",
  sessionMode: SESSION_MODE.FULL_ACCESS,
});

const createSession = (id: string): Session => {
  const sessionId = SessionIdSchema.parse(id);
  return {
    id: sessionId,
    title: "Existing Session",
    messageIds: [],
    createdAt: 1,
    updatedAt: 1,
    mode: SESSION_MODE.AUTO,
    metadata: { mcpServers: [] },
  };
};

describe("switchToSessionWithFallback", () => {
  it("switches existing sessions without creating placeholders", () => {
    const targetSessionId = SessionIdSchema.parse("session-existing");
    const existingSession = createSession("session-existing");
    const upsertSession = vi.fn();
    const setCurrentSession = vi.fn();
    const setSessionId = vi.fn();

    const switched = switchToSessionWithFallback({
      targetSessionId,
      getSession: () => existingSession,
      upsertSession,
      setCurrentSession,
      setSessionId,
      agent: createAgent(),
    });

    expect(switched).toBe(true);
    expect(upsertSession).not.toHaveBeenCalled();
    expect(setCurrentSession).toHaveBeenCalledWith(targetSessionId);
    expect(setSessionId).toHaveBeenCalledWith(targetSessionId);
  });

  it("creates placeholder sessions when target session is missing", () => {
    const targetSessionId = SessionIdSchema.parse("session-native-123456");
    const upsertSession = vi.fn();
    const setCurrentSession = vi.fn();

    const switched = switchToSessionWithFallback({
      targetSessionId,
      getSession: () => undefined,
      upsertSession,
      setCurrentSession,
      agent: createAgent(),
      now: () => 42,
    });

    expect(switched).toBe(true);
    expect(upsertSession).toHaveBeenCalledTimes(1);
    expect(upsertSession).toHaveBeenCalledWith({
      session: expect.objectContaining({
        id: targetSessionId,
        title: "Cursor Agent (session-)",
        agentId: AgentIdSchema.parse("cursor-cli"),
        createdAt: 42,
        updatedAt: 42,
        mode: SESSION_MODE.FULL_ACCESS,
        metadata: { mcpServers: [], model: "gpt-5" },
      }),
    });
    expect(setCurrentSession).toHaveBeenCalledWith(targetSessionId);
  });

  it("uses default mode and generic title without active agent", () => {
    const targetSessionId = SessionIdSchema.parse("session-resume");
    const upsertSession = vi.fn();
    const setCurrentSession = vi.fn();

    switchToSessionWithFallback({
      targetSessionId,
      getSession: () => undefined,
      upsertSession,
      setCurrentSession,
      now: () => 7,
    });

    expect(upsertSession).toHaveBeenCalledWith({
      session: expect.objectContaining({
        id: targetSessionId,
        title: "Session (session-)",
        createdAt: 7,
        updatedAt: 7,
        mode: SESSION_MODE.AUTO,
        metadata: { mcpServers: [] },
      }),
    });
  });

  it("uses native seed metadata when creating placeholder session", () => {
    const targetSessionId = SessionIdSchema.parse("session-native-seed");
    const upsertSession = vi.fn();
    const setCurrentSession = vi.fn();

    switchToSessionWithFallback({
      targetSessionId,
      getSession: () => undefined,
      upsertSession,
      setCurrentSession,
      agent: createAgent(),
      seedSession: {
        title: "Recovered Native Session",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5-thinking",
      },
      now: () => 7,
    });

    expect(upsertSession).toHaveBeenCalledWith({
      session: expect.objectContaining({
        id: targetSessionId,
        title: "Recovered Native Session",
        createdAt: Date.parse("2026-02-11T18:30:00.000Z"),
        updatedAt: Date.parse("2026-02-11T18:30:00.000Z"),
        mode: SESSION_MODE.FULL_ACCESS,
        metadata: { mcpServers: [], model: "gpt-5-thinking" },
      }),
    });
    expect(setCurrentSession).toHaveBeenCalledWith(targetSessionId);
  });

  it("falls back to now when seeded createdAt is invalid", () => {
    const targetSessionId = SessionIdSchema.parse("session-native-invalid-date");
    const upsertSession = vi.fn();
    const setCurrentSession = vi.fn();

    switchToSessionWithFallback({
      targetSessionId,
      getSession: () => undefined,
      upsertSession,
      setCurrentSession,
      seedSession: {
        title: "Recovered Native Session",
        createdAt: "not-a-date",
      },
      now: () => 11,
    });

    expect(upsertSession).toHaveBeenCalledWith({
      session: expect.objectContaining({
        id: targetSessionId,
        createdAt: 11,
        updatedAt: 11,
      }),
    });
    expect(setCurrentSession).toHaveBeenCalledWith(targetSessionId);
  });
});
