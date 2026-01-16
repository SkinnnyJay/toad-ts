import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { describe, expect, it } from "vitest";
import {
  ContentBlockSchema,
  MessageRoleSchema,
  MessageSchema,
  SessionIdSchema,
  SessionSchema,
} from "../../../src/types/domain";

describe("domain schemas", () => {
  it("parses a valid text message", () => {
    const sessionId = SessionIdSchema.parse("s-1");
    const message = MessageSchema.parse({
      id: "m-1",
      sessionId,
      role: MessageRoleSchema.parse("user"),
      content: [ContentBlockSchema.parse({ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" })],
      createdAt: Date.now(),
    });
    expect(message.content[0]).toMatchObject({ type: CONTENT_BLOCK_TYPE.TEXT, text: "hello" });
  });

  it("rejects an invalid content block", () => {
    expect(() => ContentBlockSchema.parse({ type: CONTENT_BLOCK_TYPE.TEXT })).toThrow();
  });

  it("parses a session with defaults", () => {
    const session = SessionSchema.parse({
      id: "s-2",
      messageIds: [],
      createdAt: 0,
      updatedAt: 0,
    });
    expect(session.id).toBe("s-2");
  });

  it("parses resource content blocks", () => {
    const link = ContentBlockSchema.parse({
      type: CONTENT_BLOCK_TYPE.RESOURCE_LINK,
      uri: "file:///notes.txt",
      name: "notes.txt",
    });
    const resource = ContentBlockSchema.parse({
      type: CONTENT_BLOCK_TYPE.RESOURCE,
      resource: { uri: "file:///notes.txt", text: "hello" },
    });
    expect(link.type).toBe(CONTENT_BLOCK_TYPE.RESOURCE_LINK);
    expect(resource.type).toBe(CONTENT_BLOCK_TYPE.RESOURCE);
  });
});
