export const PROVIDER_STREAM = {
  SSE_DATA_PREFIX: "data: ",
  DONE_SENTINEL: "[DONE]",
  OPENAI_FINISH_REASON_STOP: "stop",
  ANTHROPIC_EVENT_CONTENT_BLOCK_DELTA: "content_block_delta",
  ANTHROPIC_EVENT_MESSAGE_STOP: "message_stop",
  ANTHROPIC_DELTA_TEXT: "text_delta",
  ANTHROPIC_DELTA_THINKING: "thinking_delta",
} as const;

export type ProviderStreamValue = (typeof PROVIDER_STREAM)[keyof typeof PROVIDER_STREAM];
