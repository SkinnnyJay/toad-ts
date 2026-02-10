export interface ProviderMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProviderStreamChunk {
  type: "text" | "tool_call" | "thinking" | "done" | "error";
  text?: string;
  toolCallId?: string;
  toolName?: string;
  toolArguments?: string;
  error?: string;
}

export interface ProviderOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  maxRetries?: number;
}

export interface ProviderModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  supportsVision?: boolean;
  supportsThinking?: boolean;
  supportsStreaming?: boolean;
}

export interface ProviderAdapter {
  /** Unique provider identifier */
  readonly id: string;
  /** Human-readable provider name */
  readonly name: string;
  /** List available models */
  listModels(): Promise<ProviderModelInfo[]>;
  /** Send a prompt and stream the response */
  streamChat(params: {
    model: string;
    messages: ProviderMessage[];
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
  }): AsyncIterable<ProviderStreamChunk>;
  /** Check if the provider is configured and reachable */
  healthCheck(): Promise<{ ok: boolean; error?: string }>;
}

export interface ProviderFactory {
  create(apiKey: string, options?: ProviderOptions): ProviderAdapter;
}
