import type { IncomingMessage } from "node:http";

const REQUEST_URL_DEFAULT_HOST = "localhost";
const REQUEST_PATH_PREFIX = "/";
const REQUEST_NETWORK_PATH_PREFIX = "//";
const HOST_VALUE_SEPARATOR = ",";
const HOST_PROTOCOL_PREFIX = "http://";

const toHostHeaderCandidates = (hostHeader: string | string[] | undefined): string[] => {
  if (typeof hostHeader === "string") {
    return hostHeader
      .split(HOST_VALUE_SEPARATOR)
      .map((hostSegment) => hostSegment.trim())
      .filter((hostSegment) => hostSegment.length > 0);
  }
  if (Array.isArray(hostHeader)) {
    const hostCandidates: string[] = [];
    for (const hostValue of hostHeader) {
      const normalizedSegments = hostValue
        .split(HOST_VALUE_SEPARATOR)
        .map((hostSegment) => hostSegment.trim())
        .filter((hostSegment) => hostSegment.length > 0);
      if (normalizedSegments.length > 0) {
        hostCandidates.push(...normalizedSegments);
      }
    }
    return hostCandidates;
  }
  return [];
};

const parseHostCandidate = (host: string): URL | null => {
  try {
    return new URL(`${HOST_PROTOCOL_PREFIX}${host}`);
  } catch {
    return null;
  }
};

const isHostCandidateValid = (host: string): boolean => {
  const parsedHost = parseHostCandidate(host);
  if (!parsedHost) {
    return false;
  }
  return (
    parsedHost.username.length === 0 &&
    parsedHost.password.length === 0 &&
    parsedHost.pathname === REQUEST_PATH_PREFIX &&
    parsedHost.search.length === 0 &&
    parsedHost.hash.length === 0
  );
};

const parseUrlWithHost = (rawUrl: string, host: string): URL | null => {
  try {
    return new URL(rawUrl, `${HOST_PROTOCOL_PREFIX}${host}`);
  } catch {
    return null;
  }
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
  const hostCandidates = toHostHeaderCandidates(req.headers.host);
  if (hostCandidates.length === 0) {
    return parseUrlWithHost(rawUrl, REQUEST_URL_DEFAULT_HOST);
  }
  for (const host of hostCandidates) {
    if (!isHostCandidateValid(host)) {
      continue;
    }
    const parsed = parseUrlWithHost(rawUrl, host);
    if (parsed) {
      return parsed;
    }
  }
  return null;
};
