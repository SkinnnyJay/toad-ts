import { SERVER_EVENT } from "@/constants/server-events";
import { HARNESS_ID_VALIDATION_MESSAGE } from "@/harness/harness-id";
import {
  createSessionRequestSchema,
  createSessionResponseSchema,
  promptSessionRequestSchema,
  serverEventSchema,
  sessionMessagesRequestSchema,
} from "@/server/server-types";
import { describe, expect, it } from "vitest";

describe("server-types schemas", () => {
  it("accepts valid create session requests", () => {
    const parsed = createSessionRequestSchema.parse({
      harnessId: "mock",
      agentId: "assistant-agent",
      cwd: "/workspace",
      title: "My Session",
    });

    expect(parsed).toEqual({
      harnessId: "mock",
      agentId: "assistant-agent",
      cwd: "/workspace",
      title: "My Session",
    });
  });

  it("rejects unknown keys in create session request payload", () => {
    const result = createSessionRequestSchema.safeParse({
      harnessId: "mock",
      unexpected: true,
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-canonical harness id values in create session payload", () => {
    const paddedHarnessId = createSessionRequestSchema.safeParse({
      harnessId: " mock ",
    });
    const whitespaceHarnessId = createSessionRequestSchema.safeParse({
      harnessId: "   ",
    });

    expect(paddedHarnessId.success).toBe(false);
    expect(whitespaceHarnessId.success).toBe(false);
    if (!paddedHarnessId.success) {
      expect(paddedHarnessId.error.issues[0]?.message).toBe(
        HARNESS_ID_VALIDATION_MESSAGE.NON_CANONICAL
      );
    }
  });

  it("enforces create session response shape", () => {
    expect(
      createSessionResponseSchema.parse({
        sessionId: "session-1",
      })
    ).toEqual({ sessionId: "session-1" });

    const invalid = createSessionResponseSchema.safeParse({
      sessionId: "session-1",
      extra: "value",
    });
    expect(invalid.success).toBe(false);
  });

  it("requires non-empty prompt for prompt requests", () => {
    expect(promptSessionRequestSchema.safeParse({ prompt: "" }).success).toBe(false);
    expect(promptSessionRequestSchema.safeParse({ prompt: "hello" }).success).toBe(true);
  });

  it("requires session id for messages requests", () => {
    expect(sessionMessagesRequestSchema.safeParse({}).success).toBe(false);
    expect(sessionMessagesRequestSchema.safeParse({ sessionId: "session-1" }).success).toBe(true);
  });

  it("accepts all supported server event types and rejects unknown types", () => {
    const supportedTypes = [
      SERVER_EVENT.SESSION_CREATED,
      SERVER_EVENT.SESSION_UPDATE,
      SERVER_EVENT.SESSION_CLOSED,
      SERVER_EVENT.STATE_UPDATE,
    ];

    for (const type of supportedTypes) {
      const parsed = serverEventSchema.parse({
        type,
        timestamp: Date.now(),
        payload: {},
      });
      expect(parsed.type).toBe(type);
    }

    const unknownType = serverEventSchema.safeParse({
      type: "unknown",
      timestamp: Date.now(),
      payload: {},
    });
    expect(unknownType.success).toBe(false);
  });
});
