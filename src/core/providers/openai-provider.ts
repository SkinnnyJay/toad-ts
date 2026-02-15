import { LIMIT } from "@/config/limits";
import { PROVIDER_STREAM } from "@/constants/provider-stream";
import { formatProviderHttpError } from "./provider-error.utils";
import type {
  ProviderAdapter,
  ProviderMessage,
  ProviderModelInfo,
  ProviderOptions,
  ProviderStreamChunk,
} from "./provider-types";
import { appendChunkToParserBuffer } from "./stream-parser-buffer";

const OPENAI_API_BASE = "https://api.openai.com";
const OPENAI_SSE_PREFIX_LENGTH = PROVIDER_STREAM.SSE_DATA_PREFIX.length;

const OPENAI_MODELS: ProviderModelInfo[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    contextWindow: 128_000,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    contextWindow: 128_000,
    supportsVision: true,
    supportsStreaming: true,
  },
  { id: "o3", name: "o3", contextWindow: 200_000, supportsThinking: true, supportsStreaming: true },
  {
    id: "o3-mini",
    name: "o3 Mini",
    contextWindow: 200_000,
    supportsThinking: true,
    supportsStreaming: true,
  },
  {
    id: "o4-mini",
    name: "o4 Mini",
    contextWindow: 200_000,
    supportsThinking: true,
    supportsStreaming: true,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    contextWindow: 128_000,
    supportsVision: true,
    supportsStreaming: true,
  },
];

export class OpenAIProvider implements ProviderAdapter {
  readonly id = "openai";
  readonly name = "OpenAI";

  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(apiKey: string, options?: ProviderOptions) {
    this.apiKey = apiKey;
    this.baseURL = options?.baseURL ?? OPENAI_API_BASE;
    this.timeout = options?.timeout ?? 120_000;
    this.headers = options?.headers ?? {};
  }

  async listModels(): Promise<ProviderModelInfo[]> {
    return OPENAI_MODELS;
  }

  async *streamChat(params: {
    model: string;
    messages: ProviderMessage[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncIterable<ProviderStreamChunk> {
    const body = {
      model: params.model,
      messages: params.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      ...(params.maxTokens !== undefined ? { max_tokens: params.maxTokens } : {}),
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      stream: true,
    };

    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...this.headers,
      },
      body: JSON.stringify(body),
      signal: params.signal ?? AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      yield {
        type: "error",
        error: formatProviderHttpError("OpenAI", response.status, errorText),
      };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const nextBuffer = appendChunkToParserBuffer(
          buffer,
          decoder.decode(value, { stream: true }),
          LIMIT.PROVIDER_STREAM_PARSER_BUFFER_MAX_BYTES
        );
        buffer = nextBuffer.remainder;
        const lines = nextBuffer.lines;

        for (const line of lines) {
          if (!line.startsWith(PROVIDER_STREAM.SSE_DATA_PREFIX)) continue;
          const data = line.slice(OPENAI_SSE_PREFIX_LENGTH).trim();
          if (data === PROVIDER_STREAM.DONE_SENTINEL) {
            yield { type: "done" };
            return;
          }

          try {
            const event = JSON.parse(data) as Record<string, unknown>;
            const choices = event.choices as Array<Record<string, unknown>> | undefined;
            const choice = choices?.[0];
            const delta = choice?.delta as Record<string, unknown> | undefined;

            if (delta?.content) {
              yield { type: "text", text: delta.content as string };
            }

            const toolCalls = delta?.tool_calls as Array<Record<string, unknown>> | undefined;
            if (toolCalls) {
              for (const tc of toolCalls) {
                const fn = tc.function as Record<string, unknown> | undefined;
                if (fn?.arguments) {
                  yield {
                    type: "tool_call",
                    toolCallId: tc.id as string | undefined,
                    toolName: fn.name as string | undefined,
                    toolArguments: fn.arguments as string,
                  };
                }
              }
            }

            if (choice?.finish_reason === PROVIDER_STREAM.OPENAI_FINISH_REASON_STOP) {
              yield { type: "done" };
              return;
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(10_000),
      });
      return { ok: response.ok };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
