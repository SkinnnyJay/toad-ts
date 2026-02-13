import { LIMIT } from "@/config/limits";
import type {
  ProviderAdapter,
  ProviderMessage,
  ProviderModelInfo,
  ProviderOptions,
  ProviderStreamChunk,
} from "./provider-types";

const OLLAMA_DEFAULT_BASE = "http://localhost:11434";

export class OllamaProvider implements ProviderAdapter {
  readonly id = "ollama";
  readonly name = "Ollama (Local)";

  private readonly baseURL: string;
  private readonly timeout: number;

  constructor(_apiKey: string, options?: ProviderOptions) {
    this.baseURL = options?.baseURL ?? OLLAMA_DEFAULT_BASE;
    this.timeout = options?.timeout ?? 300_000;
  }

  async listModels(): Promise<ProviderModelInfo[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as { models?: Array<{ name: string; size?: number }> };
      return (data.models ?? []).map((model) => ({
        id: model.name,
        name: model.name,
        contextWindow: LIMIT.OLLAMA_DEFAULT_CONTEXT,
        supportsStreaming: true,
      }));
    } catch {
      return [];
    }
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
      stream: true,
      options: {
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
        ...(params.maxTokens !== undefined ? { num_predict: params.maxTokens } : {}),
      },
    };

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: params.signal ?? AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      yield { type: "error", error: `Ollama error ${response.status}: ${errorText}` };
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
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            if (event.message?.content) {
              yield { type: "text", text: event.message.content };
            }
            if (event.done) {
              yield { type: "done" };
              return;
            }
          } catch {
            // Skip malformed lines
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
      const response = await fetch(`${this.baseURL}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      return { ok: response.ok };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
