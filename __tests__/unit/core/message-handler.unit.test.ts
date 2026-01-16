import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
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
      content: { type: CONTENT_BLOCK_TYPE.TEXT, text: "hi" },
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
        type: CONTENT_BLOCK_TYPE.TOOL_CALL,
        toolCallId: ToolCallIdSchema.parse("t-1"),
        name: "run",
        status: TOOL_CALL_STATUS.RUNNING,
      },
    });

    expect(blockSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({ type: CONTENT_BLOCK_TYPE.TOOL_CALL, name: "run" }),
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
        type: CONTENT_BLOCK_TYPE.RESOURCE_LINK,
        uri: "file:///notes.txt",
        name: "notes.txt",
      },
    });

    handler.handle({
      sessionId: SessionIdSchema.parse("s-1"),
      messageId: MessageIdSchema.parse("m-3"),
      role: "assistant",
      content: {
        type: CONTENT_BLOCK_TYPE.RESOURCE,
        resource: {
          uri: "file:///notes.txt",
          text: "hello",
        },
      },
    });

    expect(blockSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({
          type: CONTENT_BLOCK_TYPE.RESOURCE_LINK,
          uri: "file:///notes.txt",
        }),
      })
    );
    expect(blockSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        block: expect.objectContaining({ type: CONTENT_BLOCK_TYPE.RESOURCE }),
      })
    );
  });
});
