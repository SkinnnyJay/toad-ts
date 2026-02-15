import type { IncomingMessage } from "node:http";

const REQUEST_URL_DEFAULT_HOST = "localhost";
const REQUEST_PATH_PREFIX = "/";
const REQUEST_NETWORK_PATH_PREFIX = "//";

const normalizeHostHeader = (hostHeader: string | string[] | undefined): string | null => {
  if (typeof hostHeader === "string") {
    const normalizedHost = hostHeader.trim();
    return normalizedHost.length > 0 ? normalizedHost : null;
  }
  if (Array.isArray(hostHeader)) {
    for (const hostSegment of hostHeader) {
      const normalizedHost = hostSegment.trim();
      if (normalizedHost.length > 0) {
        return normalizedHost;
      }
    }
  }
  return null;
};

export const parseRequestUrl = (req: IncomingMessage): URL | null => {
  const rawUrl = req.url?.trim();
  if (!rawUrl) {
    return null;
  }
  if (!rawUrl.startsWith(REQUEST_PATH_PREFIX)) {
    return null;
  }
  if (rawUrl.startsWith(REQUEST_NETWORK_PATH_PREFIX)) {
    return null;
  }
  const host = normalizeHostHeader(req.headers.host) ?? REQUEST_URL_DEFAULT_HOST;
  try {
    return new URL(rawUrl, `http://${host}`);
  } catch {
    return null;
  }
};
