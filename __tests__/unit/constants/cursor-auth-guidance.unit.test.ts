import { CURSOR_AUTH_GUIDANCE } from "@/constants/cursor-auth-guidance";
import { describe, expect, it } from "vitest";

describe("CURSOR_AUTH_GUIDANCE", () => {
  it("exposes canonical cursor login guidance", () => {
    expect(CURSOR_AUTH_GUIDANCE).toEqual({
      LOGIN_REQUIRED:
        "Cursor CLI is not authenticated. Run `cursor-agent login` or set CURSOR_API_KEY.",
    });
  });
});
