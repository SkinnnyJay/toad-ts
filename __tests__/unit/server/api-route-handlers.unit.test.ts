import type { IncomingMessage, ServerResponse } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/harness/harnessConfig", () => {
  return {
    loadHarnessConfig: vi.fn(),
  };
});

vi.mock("@/harness/defaultHarnessConfig", () => {
  return {
    createDefaultHarnessConfig: vi.fn(),
  };
});

const getLoadHarnessConfigMock = async () => {
  const module = await import("@/harness/harnessConfig");
  return module.loadHarnessConfig as unknown as ReturnType<typeof vi.fn>;
};

const getCreateDefaultHarnessConfigMock = async () => {
  const module = await import("@/harness/defaultHarnessConfig");
  return module.createDefaultHarnessConfig as unknown as ReturnType<typeof vi.fn>;
};

interface CapturedResponse {
  statusCode: number;
  payload: unknown;
}

const createResponseCapture = (): {
  response: ServerResponse;
  getCaptured: () => CapturedResponse;
} => {
  let capturedStatusCode = 0;
  let capturedPayload: unknown = null;
  const response = {
    writeHead: vi.fn((statusCode: number) => {
      capturedStatusCode = statusCode;
      return response;
    }),
    end: vi.fn((body?: string) => {
      capturedPayload = body ? JSON.parse(body) : null;
      return response;
    }),
  } as unknown as ServerResponse;
  return {
    response,
    getCaptured: () => ({ statusCode: capturedStatusCode, payload: capturedPayload }),
  };
};

const createHarnessConfig = (id: string, name: string) => {
  return {
    harnessId: id,
    harness: {
      id,
      name,
      command: `${id}-cmd`,
      args: [],
      env: {},
      cwd: "/workspace",
    },
    harnesses: {
      [id]: {
        id,
        name,
        command: `${id}-cmd`,
        args: [],
        env: {},
        cwd: "/workspace",
      },
    },
  };
};

describe("api route handlers", () => {
  beforeEach(async () => {
    const loadHarnessConfigMock = await getLoadHarnessConfigMock();
    const createDefaultHarnessConfigMock = await getCreateDefaultHarnessConfigMock();
    loadHarnessConfigMock.mockReset();
    createDefaultHarnessConfigMock.mockReset();
  });

  it("returns configured agents from harness config", async () => {
    const loadHarnessConfigMock = await getLoadHarnessConfigMock();
    const createDefaultHarnessConfigMock = await getCreateDefaultHarnessConfigMock();
    loadHarnessConfigMock.mockResolvedValue(createHarnessConfig("mock", "Mock Harness"));
    const { listAgents } = await import("@/server/api-routes");
    const { response, getCaptured } = createResponseCapture();

    await listAgents({} as IncomingMessage, response, {});

    const captured = getCaptured();
    expect(createDefaultHarnessConfigMock).not.toHaveBeenCalled();
    expect(captured.statusCode).toBe(200);
    expect(captured.payload).toEqual({
      agents: [
        {
          id: "mock",
          name: "Mock Harness",
          command: "mock-cmd",
          cwd: "/workspace",
        },
      ],
      defaultHarnessId: "mock",
    });
  });

  it("falls back to default harness config when loading fails", async () => {
    const loadHarnessConfigMock = await getLoadHarnessConfigMock();
    const createDefaultHarnessConfigMock = await getCreateDefaultHarnessConfigMock();
    loadHarnessConfigMock.mockRejectedValue(new Error("missing config"));
    createDefaultHarnessConfigMock.mockReturnValue(createHarnessConfig("claude-cli", "Claude CLI"));
    const { listAgents } = await import("@/server/api-routes");
    const { response, getCaptured } = createResponseCapture();

    await listAgents({} as IncomingMessage, response, {});

    const captured = getCaptured();
    expect(createDefaultHarnessConfigMock).toHaveBeenCalledTimes(1);
    expect(captured.statusCode).toBe(200);
    expect(captured.payload).toEqual({
      agents: [
        {
          id: "claude-cli",
          name: "Claude CLI",
          command: "claude-cli-cmd",
          cwd: "/workspace",
        },
      ],
      defaultHarnessId: "claude-cli",
    });
  });

  it("returns internal server error when both config and fallback fail", async () => {
    const loadHarnessConfigMock = await getLoadHarnessConfigMock();
    const createDefaultHarnessConfigMock = await getCreateDefaultHarnessConfigMock();
    loadHarnessConfigMock.mockRejectedValue(new Error("missing config"));
    createDefaultHarnessConfigMock.mockImplementation(() => {
      throw new Error("fallback failed");
    });
    const { listAgents } = await import("@/server/api-routes");
    const { response, getCaptured } = createResponseCapture();

    await listAgents({} as IncomingMessage, response, {});

    const captured = getCaptured();
    expect(captured.statusCode).toBe(500);
    expect(captured.payload).toEqual({ error: "fallback failed" });
  });
});
