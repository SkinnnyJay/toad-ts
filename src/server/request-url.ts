import type { IncomingMessage } from "node:http";

const REQUEST_URL_DEFAULT_HOST = "localhost";
const REQUEST_PATH_PREFIX = "/";
const REQUEST_NETWORK_PATH_PREFIX = "//";

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
  const rawHost = req.headers.host?.trim();
  const host = rawHost && rawHost.length > 0 ? rawHost : REQUEST_URL_DEFAULT_HOST;
  try {
    return new URL(rawUrl, `http://${host}`);
  } catch {
    return null;
  }
};
