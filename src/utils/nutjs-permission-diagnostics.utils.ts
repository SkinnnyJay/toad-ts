import type { LinuxDesktopCapability } from "@/constants/linux-desktop-capabilities";
import { LINUX_DESKTOP_CAPABILITY } from "@/constants/linux-desktop-capabilities";
import {
  NUTJS_PERMISSION_STATUS,
  NUTJS_WINDOWS_INTEGRITY_LEVEL,
  type NutJsPermissionStatus,
  type NutJsWindowsIntegrityLevel,
} from "@/constants/nutjs-permissions";
import { PLATFORM } from "@/constants/platform";
import { detectLinuxDesktopCapability } from "@/utils/linux-desktop-capability.utils";

const NUTJS_PERMISSION_MESSAGE = {
  MACOS_NOT_APPLICABLE: "macOS Accessibility check not applicable.",
  MACOS_GRANTED: "macOS Accessibility permission reported as granted.",
  MACOS_MISSING: "macOS Accessibility permission is required for NutJS automation.",
  MACOS_UNKNOWN: "macOS Accessibility permission state could not be verified.",
  LINUX_NOT_APPLICABLE: "Linux display backend check not applicable.",
  LINUX_HEADLESS: "Linux display backend missing (headless session).",
  LINUX_AVAILABLE: "Linux display backend available for NutJS automation.",
  WINDOWS_NOT_APPLICABLE: "Windows integrity-level check not applicable.",
  WINDOWS_UNKNOWN: "Windows integrity level could not be determined.",
  WINDOWS_LOW: "Windows integrity level is low; NutJS automation may be blocked.",
  WINDOWS_GRANTED: "Windows integrity level is sufficient for NutJS automation.",
} as const;

export interface NutJsPermissionCheck {
  status: NutJsPermissionStatus;
  message: string;
}

export interface NutJsPermissionDiagnostics {
  platform: NodeJS.Platform;
  ready: boolean;
  macosAccessibility: NutJsPermissionCheck;
  linuxDisplayBackend: NutJsPermissionCheck & {
    backend: LinuxDesktopCapability;
  };
  windowsIntegrityLevel: NutJsPermissionCheck & {
    integrityLevel: NutJsWindowsIntegrityLevel;
  };
}

export interface NutJsPermissionDiagnosticsOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  macosAccessibilityGranted?: boolean;
  windowsIntegrityLevel?: NutJsWindowsIntegrityLevel;
}

const resolveMacOsAccessibilityCheck = (
  platform: NodeJS.Platform,
  granted: boolean | undefined
): NutJsPermissionCheck => {
  if (platform !== PLATFORM.DARWIN) {
    return {
      status: NUTJS_PERMISSION_STATUS.NOT_APPLICABLE,
      message: NUTJS_PERMISSION_MESSAGE.MACOS_NOT_APPLICABLE,
    };
  }
  if (granted === true) {
    return {
      status: NUTJS_PERMISSION_STATUS.GRANTED,
      message: NUTJS_PERMISSION_MESSAGE.MACOS_GRANTED,
    };
  }
  if (granted === false) {
    return {
      status: NUTJS_PERMISSION_STATUS.MISSING,
      message: NUTJS_PERMISSION_MESSAGE.MACOS_MISSING,
    };
  }
  return {
    status: NUTJS_PERMISSION_STATUS.UNKNOWN,
    message: NUTJS_PERMISSION_MESSAGE.MACOS_UNKNOWN,
  };
};

const resolveLinuxDisplayCheck = (
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv
): NutJsPermissionDiagnostics["linuxDisplayBackend"] => {
  const desktop = detectLinuxDesktopCapability(env, platform);
  if (platform !== PLATFORM.LINUX) {
    return {
      status: NUTJS_PERMISSION_STATUS.NOT_APPLICABLE,
      message: NUTJS_PERMISSION_MESSAGE.LINUX_NOT_APPLICABLE,
      backend: LINUX_DESKTOP_CAPABILITY.NON_LINUX,
    };
  }
  if (desktop.capability === LINUX_DESKTOP_CAPABILITY.HEADLESS) {
    return {
      status: NUTJS_PERMISSION_STATUS.MISSING,
      message: NUTJS_PERMISSION_MESSAGE.LINUX_HEADLESS,
      backend: desktop.capability,
    };
  }
  return {
    status: NUTJS_PERMISSION_STATUS.GRANTED,
    message: NUTJS_PERMISSION_MESSAGE.LINUX_AVAILABLE,
    backend: desktop.capability,
  };
};

const resolveWindowsIntegrityCheck = (
  platform: NodeJS.Platform,
  integrityLevel: NutJsWindowsIntegrityLevel | undefined
): NutJsPermissionDiagnostics["windowsIntegrityLevel"] => {
  if (platform !== PLATFORM.WIN32) {
    return {
      status: NUTJS_PERMISSION_STATUS.NOT_APPLICABLE,
      message: NUTJS_PERMISSION_MESSAGE.WINDOWS_NOT_APPLICABLE,
      integrityLevel: NUTJS_WINDOWS_INTEGRITY_LEVEL.UNKNOWN,
    };
  }
  if (!integrityLevel || integrityLevel === NUTJS_WINDOWS_INTEGRITY_LEVEL.UNKNOWN) {
    return {
      status: NUTJS_PERMISSION_STATUS.UNKNOWN,
      message: NUTJS_PERMISSION_MESSAGE.WINDOWS_UNKNOWN,
      integrityLevel: NUTJS_WINDOWS_INTEGRITY_LEVEL.UNKNOWN,
    };
  }
  if (integrityLevel === NUTJS_WINDOWS_INTEGRITY_LEVEL.LOW) {
    return {
      status: NUTJS_PERMISSION_STATUS.MISSING,
      message: NUTJS_PERMISSION_MESSAGE.WINDOWS_LOW,
      integrityLevel,
    };
  }
  return {
    status: NUTJS_PERMISSION_STATUS.GRANTED,
    message: NUTJS_PERMISSION_MESSAGE.WINDOWS_GRANTED,
    integrityLevel,
  };
};

export const diagnoseNutJsPermissions = (
  options: NutJsPermissionDiagnosticsOptions = {}
): NutJsPermissionDiagnostics => {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const macosAccessibility = resolveMacOsAccessibilityCheck(
    platform,
    options.macosAccessibilityGranted
  );
  const linuxDisplayBackend = resolveLinuxDisplayCheck(platform, env);
  const windowsIntegrityLevel = resolveWindowsIntegrityCheck(
    platform,
    options.windowsIntegrityLevel
  );

  const checks = [macosAccessibility, linuxDisplayBackend, windowsIntegrityLevel];
  const applicableChecks = checks.filter(
    (check) => check.status !== NUTJS_PERMISSION_STATUS.NOT_APPLICABLE
  );
  const ready =
    applicableChecks.length > 0 &&
    applicableChecks.every((check) => check.status === NUTJS_PERMISSION_STATUS.GRANTED);

  return {
    platform,
    ready,
    macosAccessibility,
    linuxDisplayBackend,
    windowsIntegrityLevel,
  };
};

export const hasMissingNutJsPermissions = (diagnostics: NutJsPermissionDiagnostics): boolean =>
  diagnostics.macosAccessibility.status === NUTJS_PERMISSION_STATUS.MISSING ||
  diagnostics.linuxDisplayBackend.status === NUTJS_PERMISSION_STATUS.MISSING ||
  diagnostics.windowsIntegrityLevel.status === NUTJS_PERMISSION_STATUS.MISSING;
