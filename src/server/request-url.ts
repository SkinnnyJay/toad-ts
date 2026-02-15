import type { IncomingMessage } from "node:http";
import { isIP } from "node:net";
import { LIMIT } from "@/config/limits";

const REQUEST_URL_DEFAULT_HOST = "localhost";
const REQUEST_PATH_PREFIX = "/";
const REQUEST_NETWORK_PATH_PREFIX = "//";
const HOST_VALUE_SEPARATOR = ",";
const HOST_PROTOCOL_PREFIX = "http://";
const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
const IPV6_BRACKET_PREFIX = "[";
const IPV6_BRACKET_SUFFIX = "]";

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

const normalizeParsedHostname = (hostname: string): string | null => {
  if (hostname.startsWith(IPV6_BRACKET_PREFIX) && hostname.endsWith(IPV6_BRACKET_SUFFIX)) {
    const unwrappedHostname = hostname.slice(1, -1);
    return isIP(unwrappedHostname) === LIMIT.SERVER_IP_VERSION_IPV6 ? unwrappedHostname : null;
  }
  return hostname;
};

const isParsedHostnameValid = (hostname: string): boolean => {
  const normalizedHostname = normalizeParsedHostname(hostname);
  if (!normalizedHostname) {
    return false;
  }
  return isIP(normalizedHostname) !== 0 || HOSTNAME_PATTERN.test(normalizedHostname);
};

const isHostCandidateValid = (host: string): boolean => {
  const parsedHost = parseHostCandidate(host);
  if (!parsedHost) {
    return false;
  }
  const isValidHostname = isParsedHostnameValid(parsedHost.hostname);
  return (
    isValidHostname &&
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
