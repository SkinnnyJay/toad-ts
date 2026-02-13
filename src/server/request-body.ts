import type { IncomingMessage } from "node:http";
import { SERVER_CONFIG } from "@/config/server";
import { SERVER_RESPONSE_MESSAGE } from "@/constants/server-response-messages";

export interface ParseJsonRequestBodyOptions<TPayload> {
  readonly emptyBodyValue?: TPayload;
}

export const readRequestBody = async (
  req: IncomingMessage,
  maxBodyBytes = SERVER_CONFIG.MAX_BODY_BYTES
): Promise<string> =>
  new Promise((resolve, reject) => {
    let isSettled = false;
    let receivedBytes = 0;
    let data = "";
    const resolveOnce = (payload: string): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      resolve(payload);
    };
    const rejectOnce = (error: Error): void => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      reject(error);
    };
    req.on("data", (chunk: Buffer | string) => {
      const chunkText = typeof chunk === "string" ? chunk : chunk.toString();
      const chunkBytes = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      receivedBytes += chunkBytes;
      if (receivedBytes > maxBodyBytes) {
        rejectOnce(new Error(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE));
        return;
      }
      data += chunkText;
    });
    req.on("end", () => resolveOnce(data));
    req.on("error", (error) =>
      rejectOnce(error instanceof Error ? error : new Error(String(error)))
    );
  });

export const parseJsonRequestBody = async <TPayload>(
  req: IncomingMessage,
  options?: ParseJsonRequestBodyOptions<TPayload>
): Promise<TPayload> => {
  const body = await readRequestBody(req);
  if (body.length === 0 && options?.emptyBodyValue !== undefined) {
    return options.emptyBodyValue;
  }
  return JSON.parse(body) as TPayload;
};
