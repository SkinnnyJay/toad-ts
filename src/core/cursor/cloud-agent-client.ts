import { CURSOR_CLOUD_API, CURSOR_CLOUD_QUERY_KEY } from "@/constants/cursor-cloud-api";
import { ENV_KEY } from "@/constants/env-keys";
import { HTTP_METHOD } from "@/constants/http-methods";
import {
  type CursorCloudAgentListResponse,
  CursorCloudAgentListResponseSchema,
  type CursorCloudAgentResponse,
  CursorCloudAgentResponseSchema,
  type CursorCloudApiKeyInfoResponse,
  CursorCloudApiKeyInfoResponseSchema,
  type CursorCloudConversationResponse,
  CursorCloudConversationResponseSchema,
  type CursorCloudFollowupRequest,
  CursorCloudFollowupRequestSchema,
  type CursorCloudIdResponse,
  CursorCloudIdResponseSchema,
  type CursorCloudLaunchAgentRequest,
  CursorCloudLaunchAgentRequestSchema,
  type CursorCloudListAgentsParams,
  CursorCloudListAgentsParamsSchema,
  type CursorCloudModelsResponse,
  CursorCloudModelsResponseSchema,
  type CursorCloudRepositoriesResponse,
  CursorCloudRepositoriesResponseSchema,
} from "@/types/cursor-cloud.types";
import { retryWithBackoff } from "@/utils/async/retryWithBackoff";
import { EnvManager } from "@/utils/env/env.utils";
import type { z } from "zod";

const HTTP_STATUS_NOT_MODIFIED = 304;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;

interface EtagCacheEntry {
  etag: string;
  payload: unknown;
}

interface CursorCloudRequestOptions<TSchema extends z.ZodTypeAny> {
  method: string;
  path: string;
  query?: URLSearchParams;
  body?: unknown;
  responseSchema: TSchema;
}

export interface CursorCloudAgentClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  retryAttempts?: number;
  retryBaseMs?: number;
  retryCapMs?: number;
}

export class CursorCloudApiError extends Error {
  public readonly status: number;
  public readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "CursorCloudApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

const buildAgentsPath = (agentId: string): string =>
  `${CURSOR_CLOUD_API.VERSION_PREFIX}${CURSOR_CLOUD_API.AGENTS_PATH}/${encodeURIComponent(agentId)}`;

const isRetryableStatusCode = (statusCode: number): boolean =>
  statusCode === HTTP_STATUS_TOO_MANY_REQUESTS || statusCode >= 500;

export class CursorCloudAgentClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly retryAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryCapMs: number;
  private readonly etagCache = new Map<string, EtagCacheEntry>();

  constructor(options: CursorCloudAgentClientOptions = {}) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? CURSOR_CLOUD_API.BASE_URL;
    this.retryAttempts = options.retryAttempts ?? CURSOR_CLOUD_API.RETRY_ATTEMPTS;
    this.retryBaseMs = options.retryBaseMs ?? CURSOR_CLOUD_API.RETRY_BASE_MS;
    this.retryCapMs = options.retryCapMs ?? CURSOR_CLOUD_API.RETRY_CAP_MS;

    const env = EnvManager.getInstance().getSnapshot();
    const apiKey = options.apiKey ?? env[ENV_KEY.CURSOR_API_KEY];
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error("Cursor cloud API requires CURSOR_API_KEY.");
    }
    this.apiKey = apiKey;
  }

  async listAgents(params?: CursorCloudListAgentsParams): Promise<CursorCloudAgentListResponse> {
    const normalizedParams = CursorCloudListAgentsParamsSchema.parse(params ?? {});
    const query = new URLSearchParams();
    if (normalizedParams.limit !== undefined) {
      query.set(CURSOR_CLOUD_QUERY_KEY.LIMIT, String(normalizedParams.limit));
    }
    if (normalizedParams.cursor) {
      query.set(CURSOR_CLOUD_QUERY_KEY.CURSOR, normalizedParams.cursor);
    }
    return this.request({
      method: HTTP_METHOD.GET,
      path: `${CURSOR_CLOUD_API.VERSION_PREFIX}${CURSOR_CLOUD_API.AGENTS_PATH}`,
      query,
      responseSchema: CursorCloudAgentListResponseSchema,
    });
  }

  async getAgent(agentId: string): Promise<CursorCloudAgentResponse> {
    return this.request({
      method: HTTP_METHOD.GET,
      path: buildAgentsPath(agentId),
      responseSchema: CursorCloudAgentResponseSchema,
    });
  }

  async getConversation(agentId: string): Promise<CursorCloudConversationResponse> {
    return this.request({
      method: HTTP_METHOD.GET,
      path: `${buildAgentsPath(agentId)}/${CURSOR_CLOUD_API.CONVERSATION_PATH}`,
      responseSchema: CursorCloudConversationResponseSchema,
    });
  }

  async launchAgent(params: CursorCloudLaunchAgentRequest): Promise<CursorCloudAgentResponse> {
    const payload = CursorCloudLaunchAgentRequestSchema.parse(params);
    return this.request({
      method: HTTP_METHOD.POST,
      path: `${CURSOR_CLOUD_API.VERSION_PREFIX}${CURSOR_CLOUD_API.AGENTS_PATH}`,
      body: payload,
      responseSchema: CursorCloudAgentResponseSchema,
    });
  }

  async addFollowup(
    agentId: string,
    payload: CursorCloudFollowupRequest
  ): Promise<CursorCloudIdResponse> {
    return this.request({
      method: HTTP_METHOD.POST,
      path: `${buildAgentsPath(agentId)}/${CURSOR_CLOUD_API.FOLLOWUP_PATH}`,
      body: CursorCloudFollowupRequestSchema.parse(payload),
      responseSchema: CursorCloudIdResponseSchema,
    });
  }

  async stopAgent(agentId: string): Promise<CursorCloudIdResponse> {
    return this.request({
      method: HTTP_METHOD.POST,
      path: `${buildAgentsPath(agentId)}/${CURSOR_CLOUD_API.STOP_PATH}`,
      responseSchema: CursorCloudIdResponseSchema,
    });
  }

  async deleteAgent(agentId: string): Promise<CursorCloudIdResponse> {
    return this.request({
      method: HTTP_METHOD.DELETE,
      path: buildAgentsPath(agentId),
      responseSchema: CursorCloudIdResponseSchema,
    });
  }

  async getApiKeyInfo(): Promise<CursorCloudApiKeyInfoResponse> {
    return this.request({
      method: HTTP_METHOD.GET,
      path: `${CURSOR_CLOUD_API.VERSION_PREFIX}${CURSOR_CLOUD_API.ME_PATH}`,
      responseSchema: CursorCloudApiKeyInfoResponseSchema,
    });
  }

  async listModels(): Promise<CursorCloudModelsResponse> {
    return this.request({
      method: HTTP_METHOD.GET,
      path: `${CURSOR_CLOUD_API.VERSION_PREFIX}${CURSOR_CLOUD_API.MODELS_PATH}`,
      responseSchema: CursorCloudModelsResponseSchema,
    });
  }

  async listRepositories(): Promise<CursorCloudRepositoriesResponse> {
    return this.request({
      method: HTTP_METHOD.GET,
      path: `${CURSOR_CLOUD_API.VERSION_PREFIX}${CURSOR_CLOUD_API.REPOSITORIES_PATH}`,
      responseSchema: CursorCloudRepositoriesResponseSchema,
    });
  }

  getCachedEtagCount(): number {
    return this.etagCache.size;
  }

  private async request<TSchema extends z.ZodTypeAny>(
    options: CursorCloudRequestOptions<TSchema>
  ): Promise<z.infer<TSchema>> {
    const url = this.buildUrl(options.path, options.query);
    const shouldUseCache = options.method === HTTP_METHOD.GET;

    return retryWithBackoff(
      async () => {
        const headers = new Headers({
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        });
        if (options.body !== undefined) {
          headers.set("Content-Type", "application/json");
        }

        const cached = this.etagCache.get(url);
        if (shouldUseCache && cached) {
          headers.set("If-None-Match", cached.etag);
        }

        const response = await this.fetchFn(url, {
          method: options.method,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });

        if (response.status === HTTP_STATUS_NOT_MODIFIED && cached) {
          return options.responseSchema.parse(cached.payload);
        }

        if (!response.ok) {
          const bodyText = await response.text();
          const retryable = isRetryableStatusCode(response.status);
          throw new CursorCloudApiError(
            bodyText || `Cursor cloud API request failed with status ${response.status}`,
            response.status,
            retryable
          );
        }

        const responseBody = await this.parseResponseBody(response);
        const parsed = options.responseSchema.parse(responseBody);
        const etag = response.headers.get("etag");
        if (shouldUseCache && etag) {
          this.etagCache.set(url, {
            etag,
            payload: responseBody,
          });
        }
        return parsed;
      },
      {
        maxAttempts: this.retryAttempts,
        baseMs: this.retryBaseMs,
        capMs: this.retryCapMs,
        shouldRetry: (error) => {
          if (error instanceof CursorCloudApiError) {
            return error.retryable;
          }
          return error instanceof Error;
        },
      }
    );
  }

  private buildUrl(pathname: string, query?: URLSearchParams): string {
    const url = new URL(pathname, this.baseUrl);
    if (query && Array.from(query.keys()).length > 0) {
      url.search = query.toString();
    }
    return url.toString();
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    const bodyText = await response.text();
    if (!bodyText) {
      return {};
    }
    return JSON.parse(bodyText);
  }
}
