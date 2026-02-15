import { PROVIDER_STREAM } from "@/constants/provider-stream";
import { describe, expect, it } from "vitest";

describe("PROVIDER_STREAM constants", () => {
  it("defines expected SSE and done markers", () => {
    expect(PROVIDER_STREAM.SSE_DATA_PREFIX).toBe("data: ");
    expect(PROVIDER_STREAM.DONE_SENTINEL).toBe("[DONE]");
    expect(PROVIDER_STREAM.OPENAI_FINISH_REASON_STOP).toBe("stop");
  });

  it("defines expected anthropic event and delta markers", () => {
    expect(PROVIDER_STREAM.ANTHROPIC_EVENT_CONTENT_BLOCK_DELTA).toBe("content_block_delta");
    expect(PROVIDER_STREAM.ANTHROPIC_EVENT_MESSAGE_STOP).toBe("message_stop");
    expect(PROVIDER_STREAM.ANTHROPIC_DELTA_TEXT).toBe("text_delta");
    expect(PROVIDER_STREAM.ANTHROPIC_DELTA_THINKING).toBe("thinking_delta");
  });
});
