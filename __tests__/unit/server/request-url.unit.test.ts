import type { IncomingMessage } from "node:http";
import { parseRequestUrl } from "@/server/request-url";
import { describe, expect, it } from "vitest";

const createRequest = (url: string | undefined, host?: string): IncomingMessage =>
  ({
    url,
    headers: host ? { host } : {},
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

  it("returns null for invalid host header values", () => {
    const url = parseRequestUrl(createRequest("/health", "%"));

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
});
