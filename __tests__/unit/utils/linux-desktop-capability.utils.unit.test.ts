import { LINUX_DESKTOP_CAPABILITY } from "@/constants/linux-desktop-capabilities";
import { PLATFORM } from "@/constants/platform";
import { detectLinuxDesktopCapability } from "@/utils/linux-desktop-capability.utils";
import { describe, expect, it } from "vitest";

describe("linux desktop capability utility", () => {
  it("returns non-linux capability outside linux", () => {
    const capability = detectLinuxDesktopCapability({}, PLATFORM.DARWIN);

    expect(capability).toEqual({
      capability: LINUX_DESKTOP_CAPABILITY.NON_LINUX,
      hasWayland: false,
      hasX11: false,
      isHeadless: false,
    });
  });

  it("detects wayland from session env", () => {
    const capability = detectLinuxDesktopCapability(
      {
        WAYLAND_DISPLAY: "wayland-1",
      },
      PLATFORM.LINUX
    );

    expect(capability.capability).toBe(LINUX_DESKTOP_CAPABILITY.WAYLAND);
    expect(capability.hasWayland).toBe(true);
    expect(capability.hasX11).toBe(false);
    expect(capability.isHeadless).toBe(false);
  });

  it("detects x11 from display env", () => {
    const capability = detectLinuxDesktopCapability(
      {
        DISPLAY: ":0",
      },
      PLATFORM.LINUX
    );

    expect(capability.capability).toBe(LINUX_DESKTOP_CAPABILITY.X11);
    expect(capability.hasWayland).toBe(false);
    expect(capability.hasX11).toBe(true);
    expect(capability.isHeadless).toBe(false);
  });

  it("detects mixed mode when x11 and wayland are both present", () => {
    const capability = detectLinuxDesktopCapability(
      {
        DISPLAY: ":0",
        WAYLAND_DISPLAY: "wayland-1",
      },
      PLATFORM.LINUX
    );

    expect(capability.capability).toBe(LINUX_DESKTOP_CAPABILITY.MIXED);
    expect(capability.hasWayland).toBe(true);
    expect(capability.hasX11).toBe(true);
    expect(capability.isHeadless).toBe(false);
  });

  it("detects headless when display env is absent", () => {
    const capability = detectLinuxDesktopCapability({}, PLATFORM.LINUX);

    expect(capability.capability).toBe(LINUX_DESKTOP_CAPABILITY.HEADLESS);
    expect(capability.hasWayland).toBe(false);
    expect(capability.hasX11).toBe(false);
    expect(capability.isHeadless).toBe(true);
  });
});
