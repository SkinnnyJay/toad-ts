import { isCloudAuthError } from "@/ui/utils/cloud-auth-errors";
import { describe, expect, it } from "vitest";

describe("cloud-auth-errors", () => {
  it("returns true for CURSOR_API_KEY errors", () => {
    expect(isCloudAuthError(new Error("Cursor cloud API requires CURSOR_API_KEY."))).toBe(true);
  });

  it("returns true for unauthorized and forbidden errors", () => {
    expect(isCloudAuthError(new Error("Request failed with status 401"))).toBe(true);
    expect(isCloudAuthError(new Error("status 403 forbidden"))).toBe(true);
    expect(isCloudAuthError(new Error("authentication required"))).toBe(true);
    expect(isCloudAuthError("unauthorized response")).toBe(true);
    expect(isCloudAuthError({ message: "authentication token expired" })).toBe(true);
  });

  it("returns false for non-auth errors and non-message values", () => {
    expect(isCloudAuthError(new Error("network timeout"))).toBe(false);
    expect(isCloudAuthError("network timeout")).toBe(false);
    expect(isCloudAuthError({ message: 123 })).toBe(false);
    expect(isCloudAuthError(undefined)).toBe(false);
  });
});
