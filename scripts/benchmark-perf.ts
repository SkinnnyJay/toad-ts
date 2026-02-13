/**
 * Performance benchmark script.
 * Measures key operations against the performance budgets defined in PLAN.md.
 *
 * Budgets:
 * - App startup: < 200ms p50, < 500ms p95
 * - Session load: < 100ms p50
 * - Token optimization: < 50ms p50
 * - Context stats: < 10ms
 */

import { CONTENT_BLOCK_TYPE } from "../src/constants/content-block-types";
import { MESSAGE_ROLE } from "../src/constants/message-roles";
import { generateSessionTitle } from "../src/core/auto-title";
import { computeContextStats } from "../src/core/context-manager";
import { MessageIdSchema, SessionIdSchema } from "../src/types/domain";
import type { Message } from "../src/types/domain";

const BENCHMARK = {
  DEFAULT_ITERATIONS: 100,
  MESSAGE_COUNT_SMALL: 10,
  MESSAGE_COUNT_MEDIUM: 100,
  MESSAGE_COUNT_LARGE: 500,
  CHARS_PER_MESSAGE: 500,
} as const;

const measure = (name: string, fn: () => void, iterations = BENCHMARK.DEFAULT_ITERATIONS): void => {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] ?? 0;
  const p95 = times[Math.floor(times.length * 0.95)] ?? 0;
  const p99 = times[Math.floor(times.length * 0.99)] ?? 0;
  console.log(`${name}: p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms p99=${p99.toFixed(2)}ms`);
};

// Generate test data
const createMessages = (count: number): Message[] => {
  const sessionId = SessionIdSchema.parse("bench-session");
  return Array.from({ length: count }, (_, i) => ({
    id: MessageIdSchema.parse(`msg-${i}`),
    sessionId,
    role: (i % 2 === 0 ? MESSAGE_ROLE.USER : MESSAGE_ROLE.ASSISTANT) as Message["role"],
    content: [
      {
        type: CONTENT_BLOCK_TYPE.TEXT as const,
        text: "x".repeat(BENCHMARK.CHARS_PER_MESSAGE),
      },
    ],
    createdAt: Date.now() + i,
    isStreaming: false,
  }));
};

console.log("=== TOADSTOOL Performance Benchmarks ===\n");

// Context stats computation
const messages10 = createMessages(BENCHMARK.MESSAGE_COUNT_SMALL);
const messages100 = createMessages(BENCHMARK.MESSAGE_COUNT_MEDIUM);
const messages500 = createMessages(BENCHMARK.MESSAGE_COUNT_LARGE);

measure("Context stats (10 messages)", () => computeContextStats(messages10));
measure("Context stats (100 messages)", () => computeContextStats(messages100));
measure("Context stats (500 messages)", () => computeContextStats(messages500));

// Auto-title generation
measure("Auto-title generation", () => generateSessionTitle(messages10));

// Import performance
const importStart = performance.now();
await import("../src/config/app-config");
await import("../src/store/app-store");
await import("../src/core/session-manager");
console.log(`\nCore import time: ${(performance.now() - importStart).toFixed(1)}ms`);

console.log("\n=== Benchmarks Complete ===");
