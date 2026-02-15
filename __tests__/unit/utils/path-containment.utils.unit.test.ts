import { isPathWithinBase } from "@/utils/pathContainment.utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("isPathWithinBase", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  it("allows nested paths within base", () => {
    expect(isPathWithinBase("/tmp/base/child", "/tmp/base")).toBe(true);
  });

  it("rejects sibling paths that share the base prefix", () => {
    expect(isPathWithinBase("/tmp/base-sibling", "/tmp/base")).toBe(false);
  });

  it("treats win32 path comparison as case-insensitive", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(isPathWithinBase("C:\\Workspace\\Repo\\child", "c:\\workspace\\repo")).toBe(true);
  });
});
