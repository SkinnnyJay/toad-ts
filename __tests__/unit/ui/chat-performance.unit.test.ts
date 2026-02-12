import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { KEY_NAME } from "@/constants/key-names";
import React from "react";
import { act } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vitest";
import {
  AgentIdSchema,
  type Message,
  MessageIdSchema,
  SessionIdSchema,
} from "../../../src/types/domain";
import { MessageList } from "../../../src/ui/components/MessageList";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk } from "../../utils/ink-test-helpers";
import { keyboardRuntime } from "../../utils/opentui-test-runtime";

const UI_PERF = {
  COMPLEX_SESSION_MESSAGE_COUNT: 240,
  RENDER_SAMPLE_SIZE: 8,
  INPUT_SAMPLE_SIZE: 8,
  MESSAGE_LIST_RENDER_P95_TARGET_MS: 100,
  INPUT_LAG_P95_TARGET_MS: 20,
  MESSAGE_LIST_HEIGHT: 40,
  CHAT_AGENT_ID: "agent-perf",
  MESSAGE_PREFIX: "Performance message",
  MESSAGE_CONTENT_REPEAT: 4,
} as const;

const percentile95 = (values: number[]): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[p95Index] ?? 0;
};

const createComplexMessages = (sessionId: string): Message[] => {
  const parsedSessionId = SessionIdSchema.parse(sessionId);
  const agentId = AgentIdSchema.parse(UI_PERF.CHAT_AGENT_ID);
  return Array.from({ length: UI_PERF.COMPLEX_SESSION_MESSAGE_COUNT }, (_, index) => ({
    id: MessageIdSchema.parse(`perf-message-${index}`),
    sessionId: parsedSessionId,
    role: index % 2 === 0 ? "assistant" : "user",
    agentId,
    content: [
      {
        type: CONTENT_BLOCK_TYPE.TEXT,
        text: `${UI_PERF.MESSAGE_PREFIX} ${index} ${"x".repeat(UI_PERF.MESSAGE_CONTENT_REPEAT)}`,
      },
    ],
    createdAt: index,
    isStreaming: false,
  }));
};

afterEach(() => {
  cleanup();
});

describe("Chat UI performance budgets", () => {
  it("keeps complex MessageList render p95 under target", () => {
    const sessionId = SessionIdSchema.parse("perf-message-list-session");
    const messages = createComplexMessages(sessionId);
    const samples: number[] = [];

    for (let sampleIndex = 0; sampleIndex < UI_PERF.RENDER_SAMPLE_SIZE; sampleIndex += 1) {
      const start = performance.now();
      const renderResult = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(MessageList, {
            messages,
            height: UI_PERF.MESSAGE_LIST_HEIGHT,
            isFocused: false,
          })
        )
      );
      const frame = renderResult.lastFrame();
      const latencyMs = performance.now() - start;
      samples.push(latencyMs);
      expect(frame).toContain(UI_PERF.MESSAGE_PREFIX);
      renderResult.unmount();
    }

    const p95 = percentile95(samples);
    expect(p95).toBeLessThanOrEqual(UI_PERF.MESSAGE_LIST_RENDER_P95_TARGET_MS);
  });

  it("keeps page-scroll input lag p95 under target for complex sessions", () => {
    const sessionId = SessionIdSchema.parse("perf-scroll-session");
    const messages = createComplexMessages(sessionId);
    const { lastFrame } = renderInk(
      React.createElement(
        TruncationProvider,
        {},
        React.createElement(MessageList, {
          messages,
          height: UI_PERF.MESSAGE_LIST_HEIGHT,
          isFocused: true,
        })
      )
    );

    const inputLatenciesMs: number[] = [];
    for (let sampleIndex = 0; sampleIndex < UI_PERF.INPUT_SAMPLE_SIZE; sampleIndex += 1) {
      const start = performance.now();
      act(() => {
        keyboardRuntime.emit(KEY_NAME.PAGEUP);
      });
      lastFrame();
      inputLatenciesMs.push(performance.now() - start);
    }

    const p95 = percentile95(inputLatenciesMs);
    expect(p95).toBeLessThanOrEqual(UI_PERF.INPUT_LAG_P95_TARGET_MS);
  });
});
