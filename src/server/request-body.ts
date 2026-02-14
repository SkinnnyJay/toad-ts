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

const REQUEST_HEADER = {
  CONTENT_LENGTH: "content-length",
  CONTENT_ENCODING: "content-encoding",
} as const;

const CONTENT_ENCODING = {
  IDENTITY: "identity",
} as const;

const CONTENT_ENCODING_SEPARATOR = ",";
const UTF8_BOM = "\uFEFF";

const stripUtf8Bom = (payload: string): string =>
  payload.startsWith(UTF8_BOM) ? payload.slice(UTF8_BOM.length) : payload;

const toUtf8Buffer = (chunk: Buffer | string): Buffer =>
  typeof chunk === "string" ? Buffer.from(chunk) : chunk;

const drainRequestBody = (req: IncomingMessage): void => {
  if (typeof req.resume === "function") {
    req.resume();
  }
};

const normalizeHeaderValue = (value: string | string[] | undefined): string | null => {
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.join(CONTENT_ENCODING_SEPARATOR);
  }
  return value;
};

const getContentLength = (req: IncomingMessage): number | null => {
  const contentLengthHeader = normalizeHeaderValue(req.headers[REQUEST_HEADER.CONTENT_LENGTH]);
  if (!contentLengthHeader) {
    return null;
  }
  const trimmed = contentLengthHeader.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  }
  return Number.parseInt(trimmed, 10);
};

const hasUnsupportedContentEncoding = (req: IncomingMessage): boolean => {
  const contentEncodingHeader = normalizeHeaderValue(req.headers[REQUEST_HEADER.CONTENT_ENCODING]);
  if (!contentEncodingHeader) {
    return false;
  }
  const normalizedEncodings = contentEncodingHeader
    .split(CONTENT_ENCODING_SEPARATOR)
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0);

  if (normalizedEncodings.length === 0) {
    return false;
  }
  return normalizedEncodings.some((encoding) => encoding !== CONTENT_ENCODING.IDENTITY);
};

const preflightRequestBody = (req: IncomingMessage, maxBodyBytes: number): void => {
  if (hasUnsupportedContentEncoding(req)) {
    throw new Error(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST);
  }
  const contentLength = getContentLength(req);
  if (contentLength !== null && contentLength > maxBodyBytes) {
    throw new Error(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE);
  }
};

export const readRequestBody = async (
  req: IncomingMessage,
  maxBodyBytes = SERVER_CONFIG.MAX_BODY_BYTES,
  maxBodyReadDurationMs = SERVER_CONFIG.BODY_READ_TIMEOUT_MS
): Promise<string> =>
  new Promise((resolve, reject) => {
    try {
      preflightRequestBody(req, maxBodyBytes);
    } catch (error) {
      reject(error);
      return;
    }

    let isSettled = false;
    let hasEnded = false;
    let receivedBytes = 0;
    let data = "";
    const utf8Decoder = new StringDecoder("utf8");
    const bodyReadTimeout = setTimeout(() => {
      rejectOnce(new Error(SERVER_RESPONSE_MESSAGE.INVALID_REQUEST));
    }, maxBodyReadDurationMs);

    bodyReadTimeout.unref();
    const onData = (chunk: Buffer | string): void => {
      const chunkBuffer = toUtf8Buffer(chunk);
      const chunkText = utf8Decoder.write(chunkBuffer);
      const chunkBytes = chunkBuffer.length;
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
      clearTimeout(bodyReadTimeout);
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
      drainRequestBody(req);
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
