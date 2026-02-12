import { CURSOR_CLOUD_ENDPOINT } from "@/constants/cursor-cloud-endpoints";
import { CURSOR_LIMIT } from "@/constants/cursor-limits";
import { ENV_KEY } from "@/constants/env-keys";
import {
  type CursorCloudAgent,
  CursorCloudAgentSchema,
  type CursorCloudAgentsList,
  CursorCloudAgentsListSchema,
  type CursorCloudConversation,
  CursorCloudConversationSchema,
  type CursorCloudDeleteResponse,
  CursorCloudDeleteResponseSchema,
  type CursorCloudFollowupRequest,
  CursorCloudFollowupRequestSchema,
  type CursorCloudFollowupResponse,
  CursorCloudFollowupResponseSchema,
  type CursorCloudKeyInfo,
  CursorCloudKeyInfoSchema,
  type CursorCloudLaunchRequest,
  CursorCloudLaunchRequestSchema,
  type CursorCloudLaunchResponse,
  CursorCloudLaunchResponseSchema,
  type CursorCloudModels,
  CursorCloudModelsSchema,
  type CursorCloudRepos,
  CursorCloudReposSchema,
  type CursorCloudStopResponse,
  CursorCloudStopResponseSchema,
} from "@/types/cursor-cloud.types";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";

interface CachedGetResponse {
  etag: string;
  payload: unknown;
}

export interface CursorCloudClientOptions {
  baseUrl?: string;
  apiKey?: string;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  fetchFn?: typeof fetch;
}

export interface CursorCloudListAgentsOptions {
  cursor?: string;
  limit?: number;
}

const DEFAULT_CURSOR_CLOUD_BASE_URL = "https://api2.cursor.sh";

const shouldRetry = (status: number): boolean => status >= 500;

const wait = async (durationMs: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};

export class CursorCloudAgentClient {
  private readonly logger = createClassLogger("CursorCloudAgentClient");
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly baseRetryDelayMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly getCache = new Map<string, CachedGetResponse>();

  public constructor(options: CursorCloudClientOptions = {}) {
    const env = EnvManager.getInstance().getSnapshot();
    const apiKey = options.apiKey ?? env[ENV_KEY.CURSOR_API_KEY];
    if (!apiKey) {
      throw new Error(`Missing ${ENV_KEY.CURSOR_API_KEY} for Cursor Cloud API requests.`);
    }

    this.baseUrl = options.baseUrl ?? DEFAULT_CURSOR_CLOUD_BASE_URL;
    this.apiKey = apiKey;
    this.maxRetries = options.maxRetries ?? CURSOR_LIMIT.CLOUD_MAX_RETRIES;
    this.baseRetryDelayMs = options.baseRetryDelayMs ?? CURSOR_LIMIT.CLOUD_BASE_RETRY_DELAY_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async listAgents(
    options: CursorCloudListAgentsOptions = {}
  ): Promise<CursorCloudAgentsList> {
    const params = new URLSearchParams();
    if (options.cursor) {
      params.set("cursor", options.cursor);
    }
    if (options.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    const payload = await this.request("GET", `${CURSOR_CLOUD_ENDPOINT.AGENTS}${suffix}`);
    return CursorCloudAgentsListSchema.parse(payload);
  }

  public async getAgent(agentId: string): Promise<CursorCloudAgent> {
    const payload = await this.request("GET", `${CURSOR_CLOUD_ENDPOINT.AGENTS}/${agentId}`);
    return CursorCloudAgentSchema.parse(payload);
  }

  public async launchAgent(request: CursorCloudLaunchRequest): Promise<CursorCloudLaunchResponse> {
    const payload = await this.request(
      "POST",
      CURSOR_CLOUD_ENDPOINT.AGENTS,
      CursorCloudLaunchRequestSchema.parse(request)
    );
    return CursorCloudLaunchResponseSchema.parse(payload);
  }

  public async followupAgent(
    agentId: string,
    request: CursorCloudFollowupRequest
  ): Promise<CursorCloudFollowupResponse> {
    const payload = await this.request(
      "POST",
      `${CURSOR_CLOUD_ENDPOINT.AGENTS}/${agentId}${CURSOR_CLOUD_ENDPOINT.FOLLOWUP_SUFFIX}`,
      CursorCloudFollowupRequestSchema.parse(request)
    );
    return CursorCloudFollowupResponseSchema.parse(payload);
  }

  public async stopAgent(agentId: string): Promise<CursorCloudStopResponse> {
    const payload = await this.request(
      "POST",
      `${CURSOR_CLOUD_ENDPOINT.AGENTS}/${agentId}${CURSOR_CLOUD_ENDPOINT.STOP_SUFFIX}`
    );
    return CursorCloudStopResponseSchema.parse(payload);
  }

  public async deleteAgent(agentId: string): Promise<CursorCloudDeleteResponse> {
    const payload = await this.request("DELETE", `${CURSOR_CLOUD_ENDPOINT.AGENTS}/${agentId}`);
    return CursorCloudDeleteResponseSchema.parse(payload);
  }

  public async getConversation(agentId: string): Promise<CursorCloudConversation> {
    const payload = await this.request(
      "GET",
      `${CURSOR_CLOUD_ENDPOINT.AGENTS}/${agentId}${CURSOR_CLOUD_ENDPOINT.CONVERSATION_SUFFIX}`
    );
    return CursorCloudConversationSchema.parse(payload);
  }

  public async listModels(): Promise<CursorCloudModels> {
    const payload = await this.request("GET", CURSOR_CLOUD_ENDPOINT.MODELS);
    return CursorCloudModelsSchema.parse(payload);
  }

  public async listRepos(): Promise<CursorCloudRepos> {
    const payload = await this.request("GET", CURSOR_CLOUD_ENDPOINT.REPOS);
    return CursorCloudReposSchema.parse(payload);
  }

  public async getKeyInfo(): Promise<CursorCloudKeyInfo> {
    const payload = await this.request("GET", CURSOR_CLOUD_ENDPOINT.KEY_INFO);
    return CursorCloudKeyInfoSchema.parse(payload);
  }

  private async request(method: string, endpoint: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheEntry = method === "GET" ? this.getCache.get(url) : undefined;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    if (cacheEntry) {
      headers["If-None-Match"] = cacheEntry.etag;
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (response.status === 304 && cacheEntry) {
        return cacheEntry.payload;
      }

      if (response.ok) {
        const payload = await response.json();
        if (method === "GET") {
          const etag = response.headers.get("etag");
          if (etag) {
            this.getCache.set(url, { etag, payload });
          }
        }
        return payload;
      }

      if (!shouldRetry(response.status) || attempt === this.maxRetries) {
        const message = await response.text();
        throw new Error(
          `Cursor Cloud API ${method} ${endpoint} failed (${response.status}): ${message}`
        );
      }

      const delayMs = this.baseRetryDelayMs * 2 ** attempt;
      this.logger.warn("Retrying Cursor Cloud API request", {
        endpoint,
        status: response.status,
        attempt: attempt + 1,
        delayMs,
      });
      await wait(delayMs);
    }

    throw new Error(`Cursor Cloud API ${method} ${endpoint} exhausted retries.`);
  }
}
