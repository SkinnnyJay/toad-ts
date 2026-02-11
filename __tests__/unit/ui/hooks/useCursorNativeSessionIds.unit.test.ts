import type { AgentManagementSession } from "@/types/agent-management.types";
import { SessionIdSchema } from "@/types/domain";
import { useCursorNativeSessionIds } from "@/ui/hooks/useCursorNativeSessionIds";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderInk } from "../../../utils/ink-test-helpers";

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
};

interface NativeSessionTestClient {
  listAgentSessions?: () => Promise<AgentManagementSession[]>;
  runAgentCommand?: (
    args: string[]
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

const createIdleClient = (): NativeSessionTestClient => ({
  runAgentCommand: undefined,
});

describe("useCursorNativeSessionIds", () => {
  it("stays idle when disabled", async () => {
    const runAgentCommand = vi.fn();
    const client: NativeSessionTestClient = { runAgentCommand };

    function TestComponent() {
      const result = useCursorNativeSessionIds({
        enabled: false,
        client,
      });
      return React.createElement(
        "text",
        null,
        `ids:${result.sessionIds.length} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await flushMicrotasks();

    expect(runAgentCommand).not.toHaveBeenCalled();
    expect(lastFrame()).toContain("ids:0");
    expect(lastFrame()).toContain("loading:false");
    expect(lastFrame()).toContain("error:none");
    unmount();
  });

  it("loads and deduplicates native session ids", async () => {
    const first = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");
    const second = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174001");
    const third = SessionIdSchema.parse("session-resume-id");
    const runAgentCommand = vi.fn(async () => ({
      stdout: `${first}\n${second}\n${third} Native title model: gpt-5 messages: 14 created: 2026-02-11T18:30:00Z\n${first}`,
      stderr: "",
      exitCode: 0,
    }));
    const client: NativeSessionTestClient = { runAgentCommand };

    function TestComponent() {
      const result = useCursorNativeSessionIds({
        enabled: true,
        client,
      });
      return React.createElement(
        "text",
        null,
        `ids:${result.sessionIds.join(",")} titles:${result.sessions
          .map((session) => session.title ?? "")
          .join(",")} models:${result.sessions
          .map((session) => session.model ?? "")
          .join(",")} messageCounts:${result.sessions
          .map((session) =>
            session.messageCount !== undefined ? session.messageCount.toString() : ""
          )
          .join(",")} createdAt:${result.sessions
          .map((session) => session.createdAt ?? "")
          .join(",")} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await flushMicrotasks();

    expect(runAgentCommand).toHaveBeenCalledWith(["ls"]);
    const frame = lastFrame();
    expect(frame).toContain(first);
    expect(frame).toContain(second);
    expect(frame).toContain(third);
    expect(frame).toContain("Native title");
    expect(frame).toContain("gpt-5");
    expect(frame).toContain("14");
    expect(frame).toContain("2026-02-11T18:30:00.000Z");
    expect(frame).toContain("loading:false");
    expect(frame).toContain("error:none");
    unmount();
  });

  it("prefers listAgentSessions when runtime supports it", async () => {
    const first = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");
    const second = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174001");
    const third = SessionIdSchema.parse("session-resume-id");
    const listAgentSessions = vi.fn(async () => [
      { id: first },
      { id: second },
      { id: third },
      { id: first },
    ]);
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "",
      exitCode: 0,
    }));
    const client: NativeSessionTestClient = {
      listAgentSessions,
      runAgentCommand,
    };

    function TestComponent() {
      const result = useCursorNativeSessionIds({
        enabled: true,
        client,
      });
      return React.createElement(
        "text",
        null,
        `ids:${result.sessionIds.join(",")} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await flushMicrotasks();

    expect(listAgentSessions).toHaveBeenCalledTimes(1);
    expect(runAgentCommand).not.toHaveBeenCalled();
    const frame = lastFrame();
    expect(frame).toContain(first);
    expect(frame).toContain(second);
    expect(frame).toContain(third);
    expect(frame).toContain("loading:false");
    expect(frame).toContain("error:none");
    unmount();
  });

  it("reports command errors", async () => {
    const runAgentCommand = vi.fn(async () => ({
      stdout: "",
      stderr: "permission denied",
      exitCode: 1,
    }));
    const client: NativeSessionTestClient = { runAgentCommand };

    function TestComponent() {
      const result = useCursorNativeSessionIds({
        enabled: true,
        client,
      });
      return React.createElement(
        "text",
        null,
        `ids:${result.sessionIds.length} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await flushMicrotasks();

    expect(lastFrame()).toContain("ids:0");
    expect(lastFrame()).toContain("loading:false");
    expect(lastFrame()).toContain("permission denied");
    unmount();
  });

  it("clears state when client lacks management command support", async () => {
    const client = createIdleClient();

    function TestComponent() {
      const result = useCursorNativeSessionIds({
        enabled: true,
        client,
      });
      return React.createElement(
        "text",
        null,
        `ids:${result.sessionIds.length} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await flushMicrotasks();

    expect(lastFrame()).toContain("ids:0");
    expect(lastFrame()).toContain("loading:false");
    expect(lastFrame()).toContain("error:none");
    unmount();
  });
});
