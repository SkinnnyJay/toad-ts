import type {
  ProviderAdapter,
  ProviderMessage,
  ProviderModelInfo,
  ProviderOptions,
  ProviderStreamChunk,
} from "./provider-types";

const ANTHROPIC_API_BASE = "https://api.anthropic.com";
const ANTHROPIC_API_VERSION = "2023-06-01";

const ANTHROPIC_MODELS: ProviderModelInfo[] = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    contextWindow: 200_000,
    supportsVision: true,
    supportsThinking: true,
    supportsStreaming: true,
  },
  {
    id: "claude-haiku-4-20250514",
    name: "Claude Haiku 4",
    contextWindow: 200_000,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    contextWindow: 200_000,
    supportsVision: true,
    supportsThinking: true,
    supportsStreaming: true,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    contextWindow: 200_000,
    supportsVision: true,
    supportsStreaming: true,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    contextWindow: 200_000,
    supportsVision: true,
    supportsStreaming: true,
  },
];

export class AnthropicProvider implements ProviderAdapter {
  readonly id = "anthropic";
  readonly name = "Anthropic";

  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;

  constructor(apiKey: string, options?: ProviderOptions) {
    this.apiKey = apiKey;
    this.baseURL = options?.baseURL ?? ANTHROPIC_API_BASE;
    this.timeout = options?.timeout ?? 120_000;
    this.headers = options?.headers ?? {};
  }

  async listModels(): Promise<ProviderModelInfo[]> {
    return ANTHROPIC_MODELS;
  }

  async *streamChat(params: {
    model: string;
    messages: ProviderMessage[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncIterable<ProviderStreamChunk> {
    const systemMessages = params.messages.filter((message) => message.role === "system");
    const chatMessages = params.messages.filter((message) => message.role !== "system");
    const system = systemMessages.map((message) => message.content).join("\n");

    const body = {
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      messages: chatMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      ...(system ? { system } : {}),
      ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
      stream: true,
    };

    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
        ...this.headers,
      },
      body: JSON.stringify(body),
      signal: params.signal ?? AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      yield { type: "error", error: `Anthropic API error ${response.status}: ${errorText}` };
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

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const event = JSON.parse(data) as Record<string, unknown>;
            const eventType = event.type as string;

            if (eventType === "content_block_delta") {
              const delta = event.delta as Record<string, unknown> | undefined;
              if (delta?.type === "text_delta") {
                yield { type: "text", text: delta.text as string };
              } else if (delta?.type === "thinking_delta") {
                yield { type: "thinking", text: delta.thinking as string };
              }
            } else if (eventType === "message_stop") {
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
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      return { ok: response.ok || response.status === 400 };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
