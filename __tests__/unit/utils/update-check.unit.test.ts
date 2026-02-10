import { describe, expect, it } from "vitest";

import { isNewerVersion } from "@/utils/update-check";

describe("update-check", () => {
  it("detects newer versions", () => {
    expect(isNewerVersion("1.2.0", "1.1.9")).toBe(true);
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(true);
  });

  it("returns false for equal or older versions", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(false);
  });
});
