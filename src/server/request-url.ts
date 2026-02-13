import type { IncomingMessage } from "node:http";

const REQUEST_URL_DEFAULT_HOST = "localhost";

export const parseRequestUrl = (req: IncomingMessage): URL | null => {
  try {
    return new URL(req.url ?? "", `http://${req.headers.host ?? REQUEST_URL_DEFAULT_HOST}`);
  } catch {
    return null;
  }
};
