import { ENV_KEY } from "@/constants/env-keys";
import type { LinuxDesktopCapability } from "@/constants/linux-desktop-capabilities";
import { LINUX_DESKTOP_CAPABILITY } from "@/constants/linux-desktop-capabilities";
import { PLATFORM, type Platform } from "@/constants/platform";

const LINUX_SESSION_TYPE = {
  WAYLAND: "wayland",
  X11: "x11",
} as const;

export interface LinuxDesktopCapabilityInfo {
  capability: LinuxDesktopCapability;
  hasWayland: boolean;
  hasX11: boolean;
  isHeadless: boolean;
}

const hasEnvValue = (value: string | undefined): boolean => (value ?? "").trim().length > 0;

const detectLinuxCapability = (env: NodeJS.ProcessEnv): LinuxDesktopCapabilityInfo => {
  const sessionType = (env[ENV_KEY.XDG_SESSION_TYPE] ?? "").trim().toLowerCase();
  const hasWayland =
    hasEnvValue(env[ENV_KEY.WAYLAND_DISPLAY]) || sessionType === LINUX_SESSION_TYPE.WAYLAND;
  const hasX11 = hasEnvValue(env[ENV_KEY.DISPLAY]) || sessionType === LINUX_SESSION_TYPE.X11;

  if (hasWayland && hasX11) {
    return {
      capability: LINUX_DESKTOP_CAPABILITY.MIXED,
      hasWayland,
      hasX11,
      isHeadless: false,
    };
  }

  if (hasWayland) {
    return {
      capability: LINUX_DESKTOP_CAPABILITY.WAYLAND,
      hasWayland,
      hasX11,
      isHeadless: false,
    };
  }

  if (hasX11) {
    return {
      capability: LINUX_DESKTOP_CAPABILITY.X11,
      hasWayland,
      hasX11,
      isHeadless: false,
    };
  }

  return {
    capability: LINUX_DESKTOP_CAPABILITY.HEADLESS,
    hasWayland,
    hasX11,
    isHeadless: true,
  };
};

export const detectLinuxDesktopCapability = (
  env: NodeJS.ProcessEnv,
  platform: Platform | NodeJS.Platform = process.platform
): LinuxDesktopCapabilityInfo => {
  if (platform !== PLATFORM.LINUX) {
    return {
      capability: LINUX_DESKTOP_CAPABILITY.NON_LINUX,
      hasWayland: false,
      hasX11: false,
      isHeadless: false,
    };
  }
  return detectLinuxCapability(env);
};
