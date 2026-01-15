import { describe, expect, it, vi } from "vitest";
import { MessageHandler } from "../../../src/core/message-handler";
import { MessageIdSchema, SessionIdSchema, ToolCallIdSchema } from "../../../src/types/domain";

describe("MessageHandler", () => {
  it("emits block and done", () => {
    const handler = new MessageHandler();
    const blockSpy = vi.fn();
    const doneSpy = vi.fn();

    handler.on("block", blockSpy);
    handler.on("done", doneSpy);

    handler.handle({
      sessionId: SessionIdSchema.parse("s-1"),
      messageId: MessageIdSchema.parse("m-1"),
      role: "assistant",
      content: { type: "text", text: "hi" },
      isFinal: true,
    });

    expect(blockSpy).toHaveBeenCalledTimes(1);
    expect(doneSpy).toHaveBeenCalledTimes(1);
  });

  it("parses tool call content", () => {
    const handler = new MessageHandler();
    const blockSpy = vi.fn();
    handler.on("block", blockSpy);

    handler.handle({
      sessionId: SessionIdSchema.parse("s-1"),
      messageId: MessageIdSchema.parse("m-1"),
      role: "assistant",
      content: {
        type: "tool_call",
        toolCallId: ToolCallIdSchema.parse("t-1"),
        name: "run",
        status: "running",
      },
    });

    expect(blockSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({ type: "tool_call", name: "run" }),
      })
    );
  });

  it("parses resource blocks", () => {
    const handler = new MessageHandler();
    const blockSpy = vi.fn();
    handler.on("block", blockSpy);

    handler.handle({
      sessionId: SessionIdSchema.parse("s-1"),
      messageId: MessageIdSchema.parse("m-2"),
      role: "assistant",
      content: {
        type: "resource_link",
        uri: "file:///notes.txt",
        name: "notes.txt",
      },
    });

    handler.handle({
      sessionId: SessionIdSchema.parse("s-1"),
      messageId: MessageIdSchema.parse("m-3"),
      role: "assistant",
      content: {
        type: "resource",
        resource: {
          uri: "file:///notes.txt",
          text: "hello",
        },
      },
    });

    expect(blockSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({ type: "resource_link", uri: "file:///notes.txt" }),
      })
    );
    expect(blockSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({ type: "resource" }),
      })
    );
  });
});
