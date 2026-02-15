import type { IncomingMessage, ServerResponse } from "node:http";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { deleteSession, getConfig, submitPrompt } from "@/server/api-routes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/app-config", () => {
  return {
    loadAppConfig: vi.fn(),
  };
});

const getLoadAppConfigMock = async () => {
  const module = await import("@/config/app-config");
  return module.loadAppConfig as unknown as ReturnType<typeof vi.fn>;
};

interface CapturedResponse {
  statusCode: number;
  body: unknown;
}

const createResponseCapture = (): {
  response: ServerResponse;
  getCaptured: () => CapturedResponse;
} => {
  let statusCode = 0;
  let body: unknown = null;
  const response = {
    writeHead: (nextStatusCode: number) => {
      statusCode = nextStatusCode;
      return response;
    },
    end: (payload?: string) => {
      body = payload ? JSON.parse(payload) : null;
      return response;
    },
  } as unknown as ServerResponse;
  return {
    response,
    getCaptured: () => ({ statusCode, body }),
  };
};

describe("api-routes config/delete handlers", () => {
  beforeEach(async () => {
    const loadAppConfigMock = await getLoadAppConfigMock();
    loadAppConfigMock.mockReset();
  });

  it("deleteSession returns bad request when id param is missing", async () => {
    const { response, getCaptured } = createResponseCapture();

    await deleteSession({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: { error: SERVER_RESPONSE_MESSAGE.SESSION_ID_REQUIRED },
    });
  });

  it("deleteSession returns deleted id payload when id exists", async () => {
    const { response, getCaptured } = createResponseCapture();

    await deleteSession({} as IncomingMessage, response, { id: "session-1" });

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { deleted: "session-1" },
    });
  });

  it("getConfig returns loaded config payload on success", async () => {
    const loadAppConfigMock = await getLoadAppConfigMock();
    loadAppConfigMock.mockResolvedValue({ defaults: { agent: "mock" } });
    const { response, getCaptured } = createResponseCapture();

    await getConfig({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { config: { defaults: { agent: "mock" } } },
    });
  });

  it("getConfig returns explicit error message on Error rejection", async () => {
    const loadAppConfigMock = await getLoadAppConfigMock();
    loadAppConfigMock.mockRejectedValue(new Error("broken config"));
    const { response, getCaptured } = createResponseCapture();

    await getConfig({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { error: "broken config" },
    });
  });

  it("getConfig returns fallback error message on non-Error rejection", async () => {
    const loadAppConfigMock = await getLoadAppConfigMock();
    loadAppConfigMock.mockRejectedValue("non-error");
    const { response, getCaptured } = createResponseCapture();

    await getConfig({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { error: SERVER_RESPONSE_MESSAGE.FAILED_TO_LOAD_CONFIG },
    });
  });

  it("submitPrompt always returns submitted response", async () => {
    const { response, getCaptured } = createResponseCapture();

    await submitPrompt({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { submitted: true },
    });
  });
});
