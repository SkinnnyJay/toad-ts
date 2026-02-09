import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { SESSION_MODE } from "@/constants/session-modes";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, MessageIdSchema } from "../../../src/types/domain";
import { Chat, runSlashCommand } from "../../../src/ui/components/Chat";
import {
  cleanup,
  createMockAgent,
  renderInk,
  setupSession,
  waitFor,
} from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Chat", () => {
  it("renders empty state", () => {
    const sessionId = setupSession({ sessionId: "s-chat" });

    const { lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent("agent-1", "Agent"),
      })
    );
    expect(lastFrame()).toContain("No messages yet");
  });

  it("blocks submit when session is read-only", () => {
    const sessionId = setupSession({
      sessionId: "s-ro",
      mode: SESSION_MODE.READ_ONLY,
    });
    const promptSpy = vi.fn();

    const { stdin, lastFrame } = renderInk(
      React.createElement(Chat, {
        sessionId,
        agent: createMockAgent("agent-1", "Agent"),
        client: { prompt: promptSpy } as unknown as { prompt: typeof promptSpy },
      })
    );

    stdin.write("hi");
    stdin.write("\r");

    expect(promptSpy).not.toHaveBeenCalled();
    expect(lastFrame()).toContain("read-only");
  });

  it("handles /help slash command", async () => {
    const sessionId = setupSession({ sessionId: "s-help" });
    const store = useAppStore.getState();

    runSlashCommand("/help", {
      sessionId,
      appendSystemMessage: (text) =>
        store.appendMessage({
          id: MessageIdSchema.parse("sys-help"),
          sessionId,
          role: "system",
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
          createdAt: Date.now(),
          isStreaming: false,
        }),
      getSession: store.getSession,
      upsertSession: store.upsertSession,
      clearMessagesForSession: store.clearMessagesForSession,
      upsertPlan: store.upsertPlan,
      now: () => 0,
    });

    await waitFor(() => store.getMessagesForSession(sessionId).some((m) => m.role === "system"));

    const messages = store.getMessagesForSession(sessionId);
    const system = messages.find((m) => m.role === "system");
    const text = system?.content.find((c) => c.type === CONTENT_BLOCK_TYPE.TEXT) as
      | { type: typeof CONTENT_BLOCK_TYPE.TEXT; text: string }
      | undefined;
    expect(text?.text ?? "").toContain("Commands: /help");
  });

  it("updates mode via /mode", async () => {
    const sessionId = setupSession({ sessionId: "s-mode" });
    const store = useAppStore.getState();

    runSlashCommand(`/mode ${SESSION_MODE.READ_ONLY}`, {
      sessionId,
      appendSystemMessage: () => {},
      getSession: store.getSession,
      upsertSession: store.upsertSession,
      clearMessagesForSession: store.clearMessagesForSession,
      upsertPlan: store.upsertPlan,
    });

    await waitFor(() => store.getSession(sessionId)?.mode === SESSION_MODE.READ_ONLY);
    const session = store.getSession(sessionId);
    expect(session?.mode).toBe(SESSION_MODE.READ_ONLY);
  });

  it("clears messages via /clear", async () => {
    const sessionId = setupSession({ sessionId: "s-clear" });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("m-clear"),
      sessionId,
      role: "user",
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "hi" }],
      createdAt: Date.now(),
      isStreaming: false,
    });

    runSlashCommand("/clear", {
      sessionId,
      appendSystemMessage: () => {},
      getSession: store.getSession,
      upsertSession: store.upsertSession,
      clearMessagesForSession: store.clearMessagesForSession,
      upsertPlan: store.upsertPlan,
    });

    await waitFor(() => store.getMessagesForSession(sessionId).length === 0);
    expect(store.getMessagesForSession(sessionId)).toHaveLength(0);
  });

  it("creates a plan via /plan", async () => {
    const sessionId = setupSession({ sessionId: "s-plan" });
    const store = useAppStore.getState();

    runSlashCommand("/plan test plan", {
      sessionId,
      appendSystemMessage: () => {},
      getSession: store.getSession,
      upsertSession: store.upsertSession,
      clearMessagesForSession: store.clearMessagesForSession,
      upsertPlan: store.upsertPlan,
      now: () => 0,
    });

    await waitFor(() => Boolean(store.getPlanBySession(sessionId)));

    const plan = store.getPlanBySession(sessionId);
    expect(plan).toBeDefined();
    expect(plan?.originalPrompt).toContain("test plan");
  });

  it("copies last assistant response via /copy", async () => {
    const sessionId = setupSession({ sessionId: "s-copy" });
    const store = useAppStore.getState();
    const copySpy = vi.fn(async () => true);

    store.appendMessage({
      id: MessageIdSchema.parse("m-user-copy"),
      sessionId,
      role: MESSAGE_ROLE.USER,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Hello" }],
      createdAt: Date.now(),
      isStreaming: false,
    });
    store.appendMessage({
      id: MessageIdSchema.parse("m-assistant-copy"),
      sessionId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Copied text" }],
      createdAt: Date.now() + 1,
      isStreaming: false,
    });

    runSlashCommand("/copy", {
      sessionId,
      appendSystemMessage: (text) =>
        store.appendMessage({
          id: MessageIdSchema.parse("sys-copy"),
          sessionId,
          role: MESSAGE_ROLE.SYSTEM,
          content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text }],
          createdAt: Date.now() + 2,
          isStreaming: false,
        }),
      appendMessage: store.appendMessage,
      getSession: store.getSession,
      getMessagesForSession: store.getMessagesForSession,
      getPlanBySession: store.getPlanBySession,
      listSessions: () => Object.values(store.sessions),
      upsertSession: store.upsertSession,
      clearMessagesForSession: store.clearMessagesForSession,
      removeMessages: store.removeMessages,
      upsertPlan: store.upsertPlan,
      copyToClipboard: copySpy,
    });

    await waitFor(() => copySpy.mock.calls.length > 0);
    expect(copySpy).toHaveBeenCalledWith("Copied text");
  });

  it("undos and redoes the last message", async () => {
    const sessionId = setupSession({ sessionId: "s-undo" });
    const store = useAppStore.getState();

    store.appendMessage({
      id: MessageIdSchema.parse("m-undo-1"),
      sessionId,
      role: MESSAGE_ROLE.USER,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "First" }],
      createdAt: Date.now(),
      isStreaming: false,
    });
    store.appendMessage({
      id: MessageIdSchema.parse("m-undo-2"),
      sessionId,
      role: MESSAGE_ROLE.ASSISTANT,
      content: [{ type: CONTENT_BLOCK_TYPE.TEXT, text: "Second" }],
      createdAt: Date.now() + 1,
      isStreaming: false,
    });

    runSlashCommand("/undo", {
      sessionId,
      appendSystemMessage: () => {},
      appendMessage: store.appendMessage,
      getSession: store.getSession,
      getMessagesForSession: store.getMessagesForSession,
      getPlanBySession: store.getPlanBySession,
      listSessions: () => Object.values(store.sessions),
      upsertSession: store.upsertSession,
      clearMessagesForSession: store.clearMessagesForSession,
      removeMessages: store.removeMessages,
      upsertPlan: store.upsertPlan,
    });

    await waitFor(() => store.getMessagesForSession(sessionId).length === 1);

    runSlashCommand("/redo", {
      sessionId,
      appendSystemMessage: () => {},
      appendMessage: store.appendMessage,
      getSession: store.getSession,
      getMessagesForSession: store.getMessagesForSession,
      getPlanBySession: store.getPlanBySession,
      listSessions: () => Object.values(store.sessions),
      upsertSession: store.upsertSession,
      clearMessagesForSession: store.clearMessagesForSession,
      removeMessages: store.removeMessages,
      upsertPlan: store.upsertPlan,
    });

    await waitFor(() => store.getMessagesForSession(sessionId).length === 2);
  });
});
