import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { HTTP_STATUS } from "@/constants/http-status";
import { SERVER_EVENT } from "@/constants/server-events";
import { eventsStream } from "@/server/api-routes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/store/app-store", () => {
  return {
    useAppStore: {
      subscribe: vi.fn(),
    },
  };
});

const getSubscribeMock = async () => {
  const module = await import("@/store/app-store");
  return module.useAppStore.subscribe as unknown as ReturnType<typeof vi.fn>;
};

interface CapturedResponse {
  statusCode: number | null;
  headers: Record<string, string> | null;
  writes: string[];
}

const createResponseCapture = (): {
  response: ServerResponse;
  getCaptured: () => CapturedResponse;
} => {
  let statusCode: number | null = null;
  let headers: Record<string, string> | null = null;
  const writes: string[] = [];
  const responseEmitter = new EventEmitter();
  const response = responseEmitter as unknown as ServerResponse;
  response.writeHead = (
    nextStatusCode: number,
    nextHeaders: Record<string, string> | undefined
  ): ServerResponse => {
    statusCode = nextStatusCode;
    headers = nextHeaders ?? null;
    return response;
  };
  response.write = (chunk: string): boolean => {
    writes.push(chunk);
    return true;
  };
  return {
    response,
    getCaptured: () => ({ statusCode, headers, writes }),
  };
};

describe("eventsStream handler", () => {
  beforeEach(async () => {
    const subscribeMock = await getSubscribeMock();
    subscribeMock.mockReset();
  });

  it("sets SSE headers, streams state updates, and unsubscribes on close", async () => {
    const subscribeMock = await getSubscribeMock();
    const unsubscribe = vi.fn();
    let listener: ((state: { currentSessionId: string; connectionStatus: string }) => void) | null =
      null;

    subscribeMock.mockImplementation((callback) => {
      listener = callback as (state: {
        currentSessionId: string;
        connectionStatus: string;
      }) => void;
      return unsubscribe;
    });

    const request = new EventEmitter() as IncomingMessage;
    const { response, getCaptured } = createResponseCapture();

    await eventsStream(request, response, {});

    const captured = getCaptured();
    expect(captured.statusCode).toBe(HTTP_STATUS.OK);
    expect(captured.headers).toEqual({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(listener).not.toBeNull();

    listener?.({
      currentSessionId: "session-1",
      connectionStatus: "connected",
    });

    const payload = captured.writes[0] ?? "";
    expect(payload.startsWith("data: ")).toBe(true);
    const json = payload.replace(/^data:\s*/, "").trim();
    expect(JSON.parse(json)).toEqual({
      type: SERVER_EVENT.STATE_UPDATE,
      currentSessionId: "session-1",
      connectionStatus: "connected",
    });

    request.emit("close");
    request.emit("close");
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when response emits close event", async () => {
    const subscribeMock = await getSubscribeMock();
    const unsubscribe = vi.fn();
    subscribeMock.mockImplementation(() => unsubscribe);

    const request = new EventEmitter() as IncomingMessage;
    const { response } = createResponseCapture();

    await eventsStream(request, response, {});
    (response as unknown as EventEmitter).emit("close");
    request.emit("close");

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when response emits error event", async () => {
    const subscribeMock = await getSubscribeMock();
    const unsubscribe = vi.fn();
    subscribeMock.mockImplementation(() => unsubscribe);

    const request = new EventEmitter() as IncomingMessage;
    const { response } = createResponseCapture();

    await eventsStream(request, response, {});
    (response as unknown as EventEmitter).emit("error", new Error("stream failure"));
    request.emit("close");

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when request emits error event", async () => {
    const subscribeMock = await getSubscribeMock();
    const unsubscribe = vi.fn();
    subscribeMock.mockImplementation(() => unsubscribe);

    const request = new EventEmitter() as IncomingMessage;
    const { response } = createResponseCapture();

    await eventsStream(request, response, {});
    request.emit("error", new Error("request failure"));
    (response as unknown as EventEmitter).emit("close");

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
