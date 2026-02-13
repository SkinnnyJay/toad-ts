import type { IncomingMessage } from "node:http";
import { StringDecoder } from "node:string_decoder";
import { SERVER_CONFIG } from "@/config/server";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";

export interface ParseJsonRequestBodyOptions<TPayload> {
  readonly emptyBodyValue?: TPayload;
}

const REQUEST_STREAM_EVENT = {
  DATA: "data",
  END: "end",
  ERROR: "error",
  ABORTED: "aborted",
  CLOSE: "close",
} as const;

const UTF8_BOM = "\uFEFF";

const stripUtf8Bom = (payload: string): string =>
  payload.startsWith(UTF8_BOM) ? payload.slice(UTF8_BOM.length) : payload;

export const readRequestBody = async (
  req: IncomingMessage,
  maxBodyBytes = SERVER_CONFIG.MAX_BODY_BYTES
): Promise<string> =>
  new Promise((resolve, reject) => {
    let isSettled = false;
    let hasEnded = false;
    let receivedBytes = 0;
    let data = "";
    const utf8Decoder = new StringDecoder("utf8");
    const onData = (chunk: Buffer | string): void => {
      const chunkText = typeof chunk === "string" ? chunk : utf8Decoder.write(chunk);
      const chunkBytes = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      receivedBytes += chunkBytes;
      if (receivedBytes > maxBodyBytes) {
        rejectOnce(new Error(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE));
        return;
      }
      data += chunkText;
    };
    const onEnd = (): void => {
      hasEnded = true;
      data += utf8Decoder.end();
      resolveOnce(data);
    };
    const onError = (error: unknown): void =>
      rejectOnce(error instanceof Error ? error : new Error(String(error)));
    const onAborted = (): void => rejectOnce(new Error(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST));
    const onClose = (): void => {
      if (!hasEnded) {
        rejectOnce(new Error(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST));
      }
    };
    const cleanup = (): void => {
      req.off(REQUEST_STREAM_EVENT.DATA, onData);
      req.off(REQUEST_STREAM_EVENT.END, onEnd);
      req.off(REQUEST_STREAM_EVENT.ERROR, onError);
      req.off(REQUEST_STREAM_EVENT.ABORTED, onAborted);
      req.off(REQUEST_STREAM_EVENT.CLOSE, onClose);
    };
    const resolveOnce = (payload: string): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      cleanup();
      resolve(payload);
    };
    const rejectOnce = (error: Error): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      cleanup();
      reject(error);
    };
    req.on(REQUEST_STREAM_EVENT.DATA, onData);
    req.on(REQUEST_STREAM_EVENT.END, onEnd);
    req.on(REQUEST_STREAM_EVENT.ERROR, onError);
    req.on(REQUEST_STREAM_EVENT.ABORTED, onAborted);
    req.on(REQUEST_STREAM_EVENT.CLOSE, onClose);
  });

export const parseJsonRequestBody = async <TPayload>(
  req: IncomingMessage,
  options?: ParseJsonRequestBodyOptions<TPayload>
): Promise<TPayload> => {
  const body = await readRequestBody(req);
  const normalizedBody = stripUtf8Bom(body);
  if (normalizedBody.length === 0 && options?.emptyBodyValue !== undefined) {
    return options.emptyBodyValue;
  }
  return JSON.parse(normalizedBody) as TPayload;
};
