import type { NutJsCapabilityStatus } from "@/constants/nutjs-capabilities";
import { NUTJS_CAPABILITY } from "@/constants/nutjs-capabilities";
import { PLATFORM } from "@/constants/platform";

const NUTJS_STATUS_MESSAGE: Record<NutJsCapabilityStatus, string> = {
  [NUTJS_CAPABILITY.SUPPORTED]: "NutJS runtime available.",
  [NUTJS_CAPABILITY.UNSUPPORTED_PLATFORM]: "NutJS unsupported on this platform.",
  [NUTJS_CAPABILITY.MISSING_RUNTIME]: "NutJS runtime is not available.",
};

const SUPPORTED_NUTJS_PLATFORMS = new Set<NodeJS.Platform>([
  PLATFORM.DARWIN,
  PLATFORM.LINUX,
  PLATFORM.WIN32,
]);

export interface NutJsCapability {
  status: NutJsCapabilityStatus;
  platform: NodeJS.Platform;
  supported: boolean;
  noOp: boolean;
  message: string;
}

export interface NutJsCapabilityOptions {
  platform?: NodeJS.Platform;
  hasRuntime?: boolean;
}

export const detectNutJsCapability = (options: NutJsCapabilityOptions = {}): NutJsCapability => {
  const platform = options.platform ?? process.platform;
  if (!SUPPORTED_NUTJS_PLATFORMS.has(platform)) {
    return {
      status: NUTJS_CAPABILITY.UNSUPPORTED_PLATFORM,
      platform,
      supported: false,
      noOp: true,
      message: NUTJS_STATUS_MESSAGE[NUTJS_CAPABILITY.UNSUPPORTED_PLATFORM],
    };
  }

  const hasRuntime = options.hasRuntime ?? false;
  if (!hasRuntime) {
    return {
      status: NUTJS_CAPABILITY.MISSING_RUNTIME,
      platform,
      supported: false,
      noOp: true,
      message: NUTJS_STATUS_MESSAGE[NUTJS_CAPABILITY.MISSING_RUNTIME],
    };
  }

  return {
    status: NUTJS_CAPABILITY.SUPPORTED,
    platform,
    supported: true,
    noOp: false,
    message: NUTJS_STATUS_MESSAGE[NUTJS_CAPABILITY.SUPPORTED],
  };
};

export const withNutJsCapabilityNoop = async <T>(
  capability: NutJsCapability,
  action: () => Promise<T>
): Promise<T | null> => {
  if (capability.noOp) {
    return null;
  }
  return action();
};
