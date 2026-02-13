import type { OutgoingHttpHeaders, ServerResponse } from "node:http";

export interface JsonResponseOptions {
  readonly includeContentLength?: boolean;
  readonly headers?: OutgoingHttpHeaders;
}

const MANAGED_HEADER = {
  CONTENT_TYPE: "content-type",
  CONTENT_LENGTH: "content-length",
  JSON_CONTENT_TYPE: "application/json",
} as const;

const stripManagedHeaders = (headers: OutgoingHttpHeaders | undefined): OutgoingHttpHeaders => {
  const sanitizedHeaders: OutgoingHttpHeaders = {};
  for (const [header, value] of Object.entries(headers ?? {})) {
    const normalized = header.toLowerCase();
    if (
      normalized === MANAGED_HEADER.CONTENT_TYPE ||
      normalized === MANAGED_HEADER.CONTENT_LENGTH
    ) {
      continue;
    }
    sanitizedHeaders[header] = value;
  }
  return sanitizedHeaders;
};

export const sendJsonResponse = (
  res: ServerResponse,
  status: number,
  payload: unknown,
  options: JsonResponseOptions = {}
): void => {
  const body = JSON.stringify(payload);
  const headers: OutgoingHttpHeaders = {
    ...stripManagedHeaders(options.headers),
    "Content-Type": MANAGED_HEADER.JSON_CONTENT_TYPE,
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
