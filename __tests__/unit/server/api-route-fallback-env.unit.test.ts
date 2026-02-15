import type { IncomingMessage, ServerResponse } from "node:http";
import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { listAgents } from "@/server/api-routes";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/harness/harnessConfig", async () => {
  const actual =
    await vi.importActual<typeof import("@/harness/harnessConfig")>("@/harness/harnessConfig");
  return {
    ...actual,
    loadHarnessConfig: vi.fn(),
  };
});

const getLoadHarnessConfigMock = async () => {
  const module = await import("@/harness/harnessConfig");
  return module.loadHarnessConfig as unknown as ReturnType<typeof vi.fn>;
};

const createResponseCapture = (): {
  response: ServerResponse;
  getPayload: () => { statusCode: number; body: { agents: Array<{ id: string }> } | null };
} => {
  let statusCode = 0;
  let body: { agents: Array<{ id: string }> } | null = null;
  const response = {
    writeHead: vi.fn((nextStatusCode: number) => {
      statusCode = nextStatusCode;
      return response;
    }),
    end: vi.fn((payload?: string) => {
      body = payload ? (JSON.parse(payload) as { agents: Array<{ id: string }> }) : null;
      return response;
    }),
  } as unknown as ServerResponse;
  return {
    response,
    getPayload: () => ({ statusCode, body }),
  };
};

describe("api route fallback environment behavior", () => {
  beforeEach(async () => {
    const loadHarnessConfigMock = await getLoadHarnessConfigMock();
    loadHarnessConfigMock.mockReset();
    delete process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];
    EnvManager.resetInstance();
  });

  afterEach(() => {
    delete process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED];
    EnvManager.resetInstance();
  });

  it("omits cursor harness from default fallback when feature flag is disabled", async () => {
    const loadHarnessConfigMock = await getLoadHarnessConfigMock();
    loadHarnessConfigMock.mockRejectedValue(new Error("missing harness file"));
    const { response, getPayload } = createResponseCapture();

    await listAgents({} as IncomingMessage, response, {});

    const payload = getPayload();
    expect(payload.statusCode).toBe(200);
    expect(payload.body).toMatchObject({ agents: expect.any(Array) });
    const agentIds = payload.body?.agents?.map((agent) => agent.id) ?? [];
    expect(agentIds).not.toContain(HARNESS_DEFAULT.CURSOR_CLI_ID);
  });

  it("includes cursor harness in default fallback when feature flag is enabled", async () => {
    const loadHarnessConfigMock = await getLoadHarnessConfigMock();
    loadHarnessConfigMock.mockRejectedValue(new Error("missing harness file"));
    process.env[ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED] = "true";
    EnvManager.resetInstance();
    const { response, getPayload } = createResponseCapture();

    await listAgents({} as IncomingMessage, response, {});

    const payload = getPayload();
    expect(payload.statusCode).toBe(200);
    expect(payload.body).toMatchObject({ agents: expect.any(Array) });
    const agentIds = payload.body?.agents?.map((agent) => agent.id) ?? [];
    expect(agentIds).toContain(HARNESS_DEFAULT.CURSOR_CLI_ID);
  });
});
