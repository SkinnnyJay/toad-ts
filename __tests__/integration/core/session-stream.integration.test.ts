import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { SESSION_UPDATE_TYPE } from "@/constants/session-update-types";
import { describe, expect, it } from "vitest";

import { SessionStream } from "../../../src/core/session-stream";
import { useAppStore } from "../../../src/store/app-store";
import { SessionIdSchema } from "../../../src/types/domain";

describe("SessionStream integration", () => {
  it("streams session updates into the store", () => {
    const store = useAppStore.getState();
    store.reset();

    const sessionId = SessionIdSchema.parse("s-stream");
    const stream = new SessionStream(store);

    stream.handleSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
        content: { type: CONTENT_BLOCK_TYPE.TEXT, text: "Hello" },
      },
    });

    stream.handleSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK,
        content: { type: CONTENT_BLOCK_TYPE.TEXT, text: "World" },
        _meta: { isFinal: true },
      },
    });

    const messages = useAppStore.getState().getMessagesForSession(sessionId);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toHaveLength(2);
    expect(messages[0]?.isStreaming).toBe(false);
  });
});
