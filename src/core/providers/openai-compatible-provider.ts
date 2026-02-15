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

/**
 * Generic OpenAI-compatible provider adapter.
 * Works with Azure OpenAI, Groq, OpenRouter, Together, Fireworks, Mistral, Cohere,
 * Perplexity, xAI, and any other service exposing /v1/chat/completions.
 */
export class OpenAICompatibleProvider implements ProviderAdapter {
  readonly id: string;
  readonly name: string;

  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly knownModels: ProviderModelInfo[];

  constructor(
    id: string,
    name: string,
    apiKey: string,
    baseURL: string,
    options?: ProviderOptions & { models?: ProviderModelInfo[] }
  ) {
    this.id = id;
    this.name = name;
    this.apiKey = apiKey;
    this.baseURL = baseURL.replace(/\/$/, "");
    this.timeout = options?.timeout ?? 120_000;
    this.headers = options?.headers ?? {};
    this.knownModels = options?.models ?? [];
  }

  async listModels(): Promise<ProviderModelInfo[]> {
    if (this.knownModels.length > 0) return this.knownModels;
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...this.headers,
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as {
        data?: Array<{ id: string; owned_by?: string }>;
      };
      return (data.data ?? []).map((model) => ({
        id: model.id,
        name: model.id,
        contextWindow: 128_000,
        supportsStreaming: true,
      }));
    } catch {
      return this.knownModels;
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
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
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
        error: formatProviderHttpError(this.name, response.status, errorText),
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
    const ssePrefixLength = PROVIDER_STREAM.SSE_DATA_PREFIX.length;

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
          const data = line.slice(ssePrefixLength).trim();
          if (data === PROVIDER_STREAM.DONE_SENTINEL) {
            yield { type: "done" };
            return;
          }
          try {
            const event = JSON.parse(data) as Record<string, unknown>;
            const choices = event.choices as Array<Record<string, unknown>> | undefined;
            const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
            if (delta?.content) {
              yield { type: "text", text: delta.content as string };
            }
            if (choices?.[0]?.finish_reason === PROVIDER_STREAM.OPENAI_FINISH_REASON_STOP) {
              yield { type: "done" };
              return;
            }
          } catch {
            // Skip malformed events
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
          ...this.headers,
        },
        signal: AbortSignal.timeout(10_000),
      });
      return { ok: response.ok };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

// ── Pre-configured provider factories ──────────────────────────────────────

export const createAzureOpenAIProvider = (
  apiKey: string,
  resourceName: string,
  deploymentId: string
): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider(
    "azure-openai",
    "Azure OpenAI",
    apiKey,
    `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentId}`,
    {
      headers: { "api-key": apiKey },
      models: [
        {
          id: deploymentId,
          name: `Azure ${deploymentId}`,
          contextWindow: 128_000,
          supportsStreaming: true,
        },
      ],
    }
  );

export const createGroqProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider("groq", "Groq", apiKey, "https://api.groq.com/openai", {
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        contextWindow: 128_000,
        supportsStreaming: true,
      },
      {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B",
        contextWindow: 128_000,
        supportsStreaming: true,
      },
      {
        id: "mixtral-8x7b-32768",
        name: "Mixtral 8x7B",
        contextWindow: 32_768,
        supportsStreaming: true,
      },
    ],
  });

export const createOpenRouterProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider("openrouter", "OpenRouter", apiKey, "https://openrouter.ai/api", {
    headers: { "HTTP-Referer": "https://toadstool.dev", "X-Title": "TOADSTOOL" },
  });

export const createTogetherProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider("together", "Together AI", apiKey, "https://api.together.xyz");

export const createFireworksProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider(
    "fireworks",
    "Fireworks AI",
    apiKey,
    "https://api.fireworks.ai/inference"
  );

export const createMistralProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider("mistral", "Mistral", apiKey, "https://api.mistral.ai", {
    models: [
      {
        id: "mistral-large-latest",
        name: "Mistral Large",
        contextWindow: 128_000,
        supportsStreaming: true,
      },
      {
        id: "mistral-medium-latest",
        name: "Mistral Medium",
        contextWindow: 32_000,
        supportsStreaming: true,
      },
      { id: "codestral-latest", name: "Codestral", contextWindow: 32_000, supportsStreaming: true },
    ],
  });

export const createPerplexityProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider("perplexity", "Perplexity", apiKey, "https://api.perplexity.ai");

export const createXAIProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider("xai", "xAI", apiKey, "https://api.x.ai", {
    models: [
      { id: "grok-2", name: "Grok 2", contextWindow: 128_000, supportsStreaming: true },
      { id: "grok-2-mini", name: "Grok 2 Mini", contextWindow: 128_000, supportsStreaming: true },
    ],
  });

export const createBedrockProvider = (
  apiKey: string,
  region = "us-east-1"
): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider(
    "bedrock",
    "AWS Bedrock",
    apiKey,
    `https://bedrock-runtime.${region}.amazonaws.com`,
    {
      headers: { "X-Amzn-Bedrock-Accept": "application/json" },
      models: [
        {
          id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
          name: "Claude 3.5 Sonnet (Bedrock)",
          contextWindow: 200_000,
          supportsStreaming: true,
        },
        {
          id: "anthropic.claude-3-haiku-20240307-v1:0",
          name: "Claude 3 Haiku (Bedrock)",
          contextWindow: 200_000,
          supportsStreaming: true,
        },
      ],
    }
  );

export const createVertexProvider = (
  apiKey: string,
  projectId: string,
  region = "us-central1"
): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider(
    "vertex",
    "Google Vertex AI",
    apiKey,
    `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models`,
    {
      models: [
        {
          id: "gemini-2.0-flash",
          name: "Gemini 2.0 Flash (Vertex)",
          contextWindow: 1_000_000,
          supportsStreaming: true,
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro (Vertex)",
          contextWindow: 2_000_000,
          supportsStreaming: true,
        },
      ],
    }
  );

export const createCohereProvider = (apiKey: string): OpenAICompatibleProvider =>
  new OpenAICompatibleProvider("cohere", "Cohere", apiKey, "https://api.cohere.ai/compatibility", {
    models: [
      { id: "command-r-plus", name: "Command R+", contextWindow: 128_000, supportsStreaming: true },
      { id: "command-r", name: "Command R", contextWindow: 128_000, supportsStreaming: true },
    ],
  });
