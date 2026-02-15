import { LIMIT } from "@/config/limits";
import {
  formatProviderHttpError,
  truncateProviderFailurePayload,
} from "@/core/providers/provider-error.utils";
import { describe, expect, it } from "vitest";

describe("provider error payload truncation", () => {
  it("keeps short payloads intact", () => {
    expect(truncateProviderFailurePayload("short payload")).toBe("short payload");
  });

  it("truncates oversized payloads to configured max chars", () => {
    const longPayload = "x".repeat(LIMIT.PROVIDER_FAILURE_PAYLOAD_MAX_CHARS + 50);
    const truncated = truncateProviderFailurePayload(longPayload);
    expect(truncated.endsWith("…")).toBe(true);
    expect(truncated.length).toBe(LIMIT.PROVIDER_FAILURE_PAYLOAD_MAX_CHARS);
  });

  it("formats provider http errors with bounded payload", () => {
    const error = formatProviderHttpError("TestProvider", 500, " error payload ");
    expect(error).toBe("TestProvider API error 500: error payload");
  });
});
