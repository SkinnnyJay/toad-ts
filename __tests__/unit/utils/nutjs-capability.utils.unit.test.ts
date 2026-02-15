import { NUTJS_CAPABILITY } from "@/constants/nutjs-capabilities";
import { PLATFORM } from "@/constants/platform";
import { detectNutJsCapability, withNutJsCapabilityNoop } from "@/utils/nutjs-capability.utils";
import { describe, expect, it, vi } from "vitest";

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

  it("skips NutJS actions when capability is no-op", async () => {
    const action = vi.fn(async () => "executed");
    const capability = detectNutJsCapability({
      platform: PLATFORM.LINUX,
      hasRuntime: false,
    });

    const result = await withNutJsCapabilityNoop(capability, action);

    expect(result).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it("executes NutJS actions when capability is supported", async () => {
    const action = vi.fn(async () => "executed");
    const capability = detectNutJsCapability({
      platform: PLATFORM.DARWIN,
      hasRuntime: true,
    });

    const result = await withNutJsCapabilityNoop(capability, action);

    expect(result).toBe("executed");
    expect(action).toHaveBeenCalledTimes(1);
  });
});
