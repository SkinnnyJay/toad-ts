import { NUTJS_CAPABILITY } from "@/constants/nutjs-capabilities";
import { PLATFORM } from "@/constants/platform";
import { detectNutJsCapability } from "@/utils/nutjs-capability.utils";
import { describe, expect, it } from "vitest";

describe("nutjs capability detector", () => {
  it("returns explicit no-op for unsupported platforms", () => {
    const capability = detectNutJsCapability({
      platform: "aix",
      hasRuntime: true,
    });

    expect(capability.status).toBe(NUTJS_CAPABILITY.UNSUPPORTED_PLATFORM);
    expect(capability.noOp).toBe(true);
    expect(capability.supported).toBe(false);
  });

  it("returns explicit no-op when runtime is unavailable", () => {
    const capability = detectNutJsCapability({
      platform: PLATFORM.LINUX,
      hasRuntime: false,
    });

    expect(capability.status).toBe(NUTJS_CAPABILITY.MISSING_RUNTIME);
    expect(capability.noOp).toBe(true);
    expect(capability.supported).toBe(false);
  });

  it("marks supported platforms as executable when runtime exists", () => {
    const capability = detectNutJsCapability({
      platform: PLATFORM.WIN32,
      hasRuntime: true,
    });

    expect(capability.status).toBe(NUTJS_CAPABILITY.SUPPORTED);
    expect(capability.noOp).toBe(false);
    expect(capability.supported).toBe(true);
  });
});
