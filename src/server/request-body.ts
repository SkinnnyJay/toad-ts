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
    let receivedBytes = 0;
    let data = "";
    req.on("data", (chunk: Buffer | string) => {
      const chunkText = typeof chunk === "string" ? chunk : chunk.toString();
      const chunkBytes = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      receivedBytes += chunkBytes;
      if (receivedBytes > maxBodyBytes) {
        reject(new Error(SERVER_RESPONSE_MESSAGE.REQUEST_BODY_TOO_LARGE));
        return;
      }
      data += chunkText;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
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
