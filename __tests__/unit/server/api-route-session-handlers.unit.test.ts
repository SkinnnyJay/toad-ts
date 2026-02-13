import type { IncomingMessage, ServerResponse } from "node:http";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";
import { getSession, listMessages, listSessions } from "@/server/api-routes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/store/app-store", () => {
  return {
    useAppStore: {
      getState: vi.fn(),
    },
  };
});

const getStoreGetStateMock = async () => {
  const module = await import("@/store/app-store");
  return module.useAppStore.getState as unknown as ReturnType<typeof vi.fn>;
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

describe("api-routes session handlers", () => {
  beforeEach(async () => {
    const getStateMock = await getStoreGetStateMock();
    getStateMock.mockReset();
  });

  it("listSessions filters undefined sessions", async () => {
    const getStateMock = await getStoreGetStateMock();
    getStateMock.mockReturnValue({
      sessions: {
        "session-1": { id: "session-1", title: "Session One" },
        "session-2": undefined,
      },
    });
    const { response, getCaptured } = createResponseCapture();

    await listSessions({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { sessions: [{ id: "session-1", title: "Session One" }] },
    });
  });

  it("getSession returns bad request when session id is missing", async () => {
    const { response, getCaptured } = createResponseCapture();

    await getSession({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: { error: SERVER_RESPONSE_MESSAGE.SESSION_ID_REQUIRED },
    });
  });

  it("getSession returns not found when session does not exist", async () => {
    const getStateMock = await getStoreGetStateMock();
    getStateMock.mockReturnValue({
      getSession: () => undefined,
    });
    const { response, getCaptured } = createResponseCapture();

    await getSession({} as IncomingMessage, response, { id: "session-1" });

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.NOT_FOUND,
      body: { error: SERVER_RESPONSE_MESSAGE.SESSION_NOT_FOUND },
    });
  });

  it("getSession returns session payload when session exists", async () => {
    const getStateMock = await getStoreGetStateMock();
    const session = { id: "session-1", title: "Session One" };
    getStateMock.mockReturnValue({
      getSession: () => session,
    });
    const { response, getCaptured } = createResponseCapture();

    await getSession({} as IncomingMessage, response, { id: "session-1" });

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { session },
    });
  });

  it("listMessages returns bad request when session id is missing", async () => {
    const { response, getCaptured } = createResponseCapture();

    await listMessages({} as IncomingMessage, response, {});

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.BAD_REQUEST,
      body: { error: SERVER_RESPONSE_MESSAGE.SESSION_ID_REQUIRED },
    });
  });

  it("listMessages returns messages for session", async () => {
    const getStateMock = await getStoreGetStateMock();
    const messages = [{ id: "msg-1", role: "user", content: [{ type: "text", text: "hi" }] }];
    getStateMock.mockReturnValue({
      getMessagesForSession: () => messages,
    });
    const { response, getCaptured } = createResponseCapture();

    await listMessages({} as IncomingMessage, response, { id: "session-1" });

    expect(getCaptured()).toEqual({
      statusCode: HTTP_STATUS.OK,
      body: { messages },
    });
  });
});
