import type { IncomingMessage } from "node:http";
import { parseRequestUrl } from "@/server/request-url";
import { describe, expect, it } from "vitest";

const createRequest = (url: string | undefined, host?: string): IncomingMessage =>
  ({
    url,
    headers: host ? { host } : {},
  }) as unknown as IncomingMessage;

const createRequestWithHostHeader = (
  url: string | undefined,
  hostHeader: string | string[]
): IncomingMessage =>
  ({
    url,
    headers: { host: hostHeader },
  }) as unknown as IncomingMessage;

describe("parseRequestUrl", () => {
  it("parses request url with provided host", () => {
    const url = parseRequestUrl(createRequest("/api/files/search?q=readme", "127.0.0.1:4141"));

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.searchParams.get("q")).toBe("readme");
  });

  it("parses request url when host header is missing", () => {
    const url = parseRequestUrl(createRequest("/health"));

    expect(url?.pathname).toBe("/health");
    expect(url?.host).toBe("localhost");
  });

  it("parses request url with hash suffix", () => {
    const url = parseRequestUrl(createRequest("/api/files/search#latest", "127.0.0.1:4141"));

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.hash).toBe("#latest");
  });

  it("returns null for invalid host header values", () => {
    const url = parseRequestUrl(createRequest("/health", "%"));

    expect(url).toBeNull();
  });

  it("returns null for host header values that include a path segment", () => {
    const url = parseRequestUrl(createRequest("/health", "example.com/path"));

    expect(url).toBeNull();
  });

  it("returns null for host header values that include hash metadata", () => {
    const url = parseRequestUrl(createRequest("/health", "example.com#summary"));

    expect(url).toBeNull();
  });

  it("returns null for host header values that include userinfo", () => {
    const url = parseRequestUrl(createRequest("/health", "user@example.com"));

    expect(url).toBeNull();
  });

  it("returns null for host header values with invalid hostname labels", () => {
    const url = parseRequestUrl(createRequest("/health", "exa_mple.com"));

    expect(url).toBeNull();
  });

  it("returns null for malformed absolute request urls", () => {
    const url = parseRequestUrl(createRequest("http://%"));

    expect(url).toBeNull();
  });

  it("returns null for absolute request urls", () => {
    const url = parseRequestUrl(createRequest("https://example.com/api/files/search?q=readme"));

    expect(url).toBeNull();
  });

  it("returns null for protocol-relative request urls", () => {
    const url = parseRequestUrl(createRequest("//example.com/api/files/search?q=readme"));

    expect(url).toBeNull();
  });

  it("returns null when request url is missing", () => {
    const url = parseRequestUrl(createRequest(undefined, "127.0.0.1:4141"));

    expect(url).toBeNull();
  });

  it("parses request url when url and host include surrounding whitespace", () => {
    const url = parseRequestUrl(
      createRequest("  /api/files/search?q=readme  ", " 127.0.0.1:4141 ")
    );

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.searchParams.get("q")).toBe("readme");
  });

  it("parses request url when url contains trailing-slash hash and surrounding whitespace", () => {
    const url = parseRequestUrl(createRequest("  /api/files/search/#latest  ", " 127.0.0.1:4141 "));

    expect(url?.pathname).toBe("/api/files/search/");
    expect(url?.hash).toBe("#latest");
  });

  it("parses request url when host header is provided as string array", () => {
    const url = parseRequestUrl(createRequestWithHostHeader("/health", ["127.0.0.1:4141"]));

    expect(url?.pathname).toBe("/health");
    expect(url?.host).toBe("127.0.0.1:4141");
  });

  it("falls back to localhost when host header array is blank", () => {
    const url = parseRequestUrl(createRequestWithHostHeader("/health", [" ", ""]));

    expect(url?.pathname).toBe("/health");
    expect(url?.host).toBe("localhost");
  });

  it("parses request url with bracketed ipv6 host and port", () => {
    const url = parseRequestUrl(createRequest("/health", "[::1]:4141"));

    expect(url?.pathname).toBe("/health");
    expect(url?.host).toBe("[::1]:4141");
  });

  it("returns null for malformed bracketed ipv6 host values", () => {
    const url = parseRequestUrl(createRequest("/health", "[::1"));

    expect(url).toBeNull();
  });

  it("uses first host value when host header contains comma-separated entries", () => {
    const url = parseRequestUrl(
      createRequestWithHostHeader("/api/files/search?q=readme", "127.0.0.1:4141, example.com")
    );

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.host).toBe("127.0.0.1:4141");
  });

  it("uses later host candidate when earlier candidate is invalid", () => {
    const url = parseRequestUrl(
      createRequestWithHostHeader("/api/files/search?q=readme", "%, 127.0.0.1:4141")
    );

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.host).toBe("127.0.0.1:4141");
  });

  it("uses later host candidate when earlier candidate has path metadata", () => {
    const url = parseRequestUrl(
      createRequestWithHostHeader("/api/files/search?q=readme", "example.com/path, 127.0.0.1:4141")
    );

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.host).toBe("127.0.0.1:4141");
  });

  it("uses later host candidate when earlier candidate has malformed ipv6 brackets", () => {
    const url = parseRequestUrl(
      createRequestWithHostHeader("/api/files/search?q=readme", "[::1, 127.0.0.1:4141")
    );

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.host).toBe("127.0.0.1:4141");
  });

  it("uses later host candidate when earlier candidate hostname is invalid", () => {
    const url = parseRequestUrl(
      createRequestWithHostHeader("/api/files/search?q=readme", "exa_mple.com, 127.0.0.1:4141")
    );

    expect(url?.pathname).toBe("/api/files/search");
    expect(url?.host).toBe("127.0.0.1:4141");
  });
});
