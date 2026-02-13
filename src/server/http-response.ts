import type { OutgoingHttpHeaders, ServerResponse } from "node:http";

export interface JsonResponseOptions {
  readonly includeContentLength?: boolean;
  readonly headers?: OutgoingHttpHeaders;
}

export const sendJsonResponse = (
  res: ServerResponse,
  status: number,
  payload: unknown,
  options: JsonResponseOptions = {}
): void => {
  const body = JSON.stringify(payload);
  const headers: OutgoingHttpHeaders = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  if (options.includeContentLength) {
    headers["Content-Length"] = Buffer.byteLength(body);
  }
  res.writeHead(status, headers);
  res.end(body);
};

export const sendErrorResponse = (
  res: ServerResponse,
  status: number,
  message: string,
  options: JsonResponseOptions = {}
): void => {
  sendJsonResponse(res, status, { error: message }, options);
};
