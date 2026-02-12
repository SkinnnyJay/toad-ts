import type {
  AgentManagementCommandResult,
  AgentManagementSession,
} from "@/types/agent-management.types";
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
  runAgentCommand?: (args: string[]) => Promise<AgentManagementCommandResult>;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolveFn: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  if (!resolveFn) {
    throw new Error("Failed to initialize deferred promise resolver");
  }
  return { promise, resolve: resolveFn };
};

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
      stdout: `${first}\n${second}\n${third} Native title model: gpt-5 messages: 14 createdAt=2026-02-11T18:30:00Z\n${first}`,
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
    expect(frame.lastIndexOf(first)).toBe(frame.indexOf(first));
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
      {
        id: first,
        title: "Native runtime session",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
      { id: `  ${second}  ` },
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

    expect(listAgentSessions).toHaveBeenCalledTimes(1);
    expect(runAgentCommand).not.toHaveBeenCalled();
    const frame = lastFrame();
    expect(frame).toContain(first);
    expect(frame).toContain(second);
    expect(frame).toContain(third);
    expect(frame).toContain("Native runtime session");
    expect(frame).toContain("gpt-5");
    expect(frame).toContain("14");
    expect(frame).toContain("2026-02-11T18:30:00.000Z");
    expect(frame).toContain("loading:false");
    expect(frame).toContain("error:none");
    unmount();
  });

  it("merges metadata from duplicate runtime-native sessions", async () => {
    const first = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");
    const listAgentSessions = vi.fn(async () => [
      {
        id: first,
        title: "Old",
        createdAt: "2026-02-10T18:30:00.000Z",
        messageCount: 1,
      },
      {
        id: first,
        title: "Recovered title",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
    ]);
    const client: NativeSessionTestClient = { listAgentSessions };

    function TestComponent() {
      const result = useCursorNativeSessionIds({
        enabled: true,
        client,
      });
      const firstSession = result.sessions[0];
      return React.createElement(
        "text",
        null,
        `id:${firstSession?.id ?? "none"} title:${firstSession?.title ?? "none"} model:${
          firstSession?.model ?? "none"
        } messages:${
          firstSession?.messageCount !== undefined ? String(firstSession.messageCount) : "none"
        }`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await flushMicrotasks();

    const frame = lastFrame();
    expect(frame).toContain(first);
    expect(frame).toContain("Recovered title");
    expect(frame).toContain("gpt-5");
    expect(frame).toContain("14");
    expect(frame).not.toContain("title:Old");
    unmount();
  });

  it("orders runtime-native sessions by newest created timestamp first", async () => {
    const oldest = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174010");
    const newest = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174011");
    const middle = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174012");
    const listAgentSessions = vi.fn(async () => [
      { id: oldest, createdAt: "2026-02-10T18:30:00.000Z" },
      { id: newest, createdAt: "2026-02-11T18:30:00.000Z" },
      { id: middle, createdAt: "2026-02-10T22:00:00.000Z" },
    ]);
    const client: NativeSessionTestClient = { listAgentSessions };

    function TestComponent() {
      const result = useCursorNativeSessionIds({
        enabled: true,
        client,
      });
      return React.createElement(
        "text",
        null,
        `ids:${result.sessions.map((session) => session.id).join(",")}`
      );
    }

    const { lastFrame, unmount } = renderInk(React.createElement(TestComponent));
    await flushMicrotasks();

    const frame = lastFrame();
    const newestIndex = frame.indexOf(newest);
    const middleIndex = frame.indexOf(middle);
    const oldestIndex = frame.indexOf(oldest);
    expect(newestIndex).toBeGreaterThanOrEqual(0);
    expect(middleIndex).toBeGreaterThanOrEqual(0);
    expect(oldestIndex).toBeGreaterThanOrEqual(0);
    expect(newestIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(oldestIndex);
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

  it("ignores stale in-flight list results after disabling", async () => {
    const staleSessionId = SessionIdSchema.parse("123e4567-e89b-12d3-a456-426614174999");
    const deferred = createDeferred<AgentManagementCommandResult>();
    const runAgentCommand = vi.fn(() => deferred.promise);
    const client: NativeSessionTestClient = { runAgentCommand };

    function TestComponent({ enabled }: { enabled: boolean }) {
      const result = useCursorNativeSessionIds({
        enabled,
        client,
      });
      return React.createElement(
        "text",
        null,
        `ids:${result.sessionIds.join(",")} loading:${String(result.loading)} error:${result.error ?? "none"}`
      );
    }

    const { lastFrame, rerender, unmount } = renderInk(
      React.createElement(TestComponent, { enabled: true })
    );
    await flushMicrotasks();
    expect(lastFrame()).toContain("loading:true");

    rerender(React.createElement(TestComponent, { enabled: false }));
    await flushMicrotasks();
    expect(lastFrame()).toContain("ids:");
    expect(lastFrame()).toContain("loading:false");
    expect(lastFrame()).toContain("error:none");

    deferred.resolve({
      stdout: staleSessionId,
      stderr: "",
      exitCode: 0,
    });
    await flushMicrotasks();

    const frame = lastFrame();
    expect(runAgentCommand).toHaveBeenCalledTimes(1);
    expect(frame).not.toContain(staleSessionId);
    expect(frame).toContain("loading:false");
    expect(frame).toContain("error:none");
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
