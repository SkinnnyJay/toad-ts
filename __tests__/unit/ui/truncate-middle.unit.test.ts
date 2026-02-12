import { truncateMiddle } from "@/ui/utils/truncate-middle";
import { describe, expect, it } from "vitest";

describe("truncateMiddle", () => {
  it("returns original value when within max length", () => {
    expect(truncateMiddle("short", 10)).toBe("short");
  });

  it("truncates from the middle when exceeding max length", () => {
    expect(truncateMiddle("1234567890", 7)).toBe("12...90");
  });
});
