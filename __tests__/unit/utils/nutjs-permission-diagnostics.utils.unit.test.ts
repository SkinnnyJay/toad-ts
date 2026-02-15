import { ENV_KEY } from "@/constants/env-keys";
import { LINUX_DESKTOP_CAPABILITY } from "@/constants/linux-desktop-capabilities";
import {
  NUTJS_PERMISSION_STATUS,
  NUTJS_WINDOWS_INTEGRITY_LEVEL,
} from "@/constants/nutjs-permissions";
import { PLATFORM } from "@/constants/platform";
import {
  diagnoseNutJsPermissions,
  hasMissingNutJsPermissions,
} from "@/utils/nutjs-permission-diagnostics.utils";
import { describe, expect, it } from "vitest";

describe("nutjs permission diagnostics", () => {
  it("marks unsupported platforms as not ready", () => {
    const diagnostics = diagnoseNutJsPermissions({ platform: "aix" });

    expect(diagnostics.ready).toBe(false);
    expect(diagnostics.macosAccessibility.status).toBe(NUTJS_PERMISSION_STATUS.NOT_APPLICABLE);
    expect(diagnostics.linuxDisplayBackend.status).toBe(NUTJS_PERMISSION_STATUS.NOT_APPLICABLE);
    expect(diagnostics.windowsIntegrityLevel.status).toBe(NUTJS_PERMISSION_STATUS.NOT_APPLICABLE);
  });

  it("reports missing linux backend in headless sessions", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: PLATFORM.LINUX,
      env: {},
    });

    expect(diagnostics.ready).toBe(false);
    expect(diagnostics.linuxDisplayBackend.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
    expect(diagnostics.linuxDisplayBackend.backend).toBe(LINUX_DESKTOP_CAPABILITY.HEADLESS);
  });

  it("reports granted linux backend for x11 sessions", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: PLATFORM.LINUX,
      env: { [ENV_KEY.DISPLAY]: ":0" },
    });

    expect(diagnostics.ready).toBe(true);
    expect(diagnostics.linuxDisplayBackend.status).toBe(NUTJS_PERMISSION_STATUS.GRANTED);
    expect(diagnostics.linuxDisplayBackend.backend).toBe(LINUX_DESKTOP_CAPABILITY.X11);
  });

  it("reports missing macOS accessibility permission", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: PLATFORM.DARWIN,
      macosAccessibilityGranted: false,
    });

    expect(diagnostics.ready).toBe(false);
    expect(diagnostics.macosAccessibility.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });

  it("reports insufficient windows integrity level as missing", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: PLATFORM.WIN32,
      windowsIntegrityLevel: NUTJS_WINDOWS_INTEGRITY_LEVEL.LOW,
    });

    expect(diagnostics.ready).toBe(false);
    expect(diagnostics.windowsIntegrityLevel.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });

  it("reports windows medium integrity as granted", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: PLATFORM.WIN32,
      windowsIntegrityLevel: NUTJS_WINDOWS_INTEGRITY_LEVEL.MEDIUM,
    });

    expect(diagnostics.ready).toBe(true);
    expect(diagnostics.windowsIntegrityLevel.status).toBe(NUTJS_PERMISSION_STATUS.GRANTED);
  });

  it("detects explicit missing permissions in diagnostics", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: PLATFORM.LINUX,
      env: {},
    });

    expect(hasMissingNutJsPermissions(diagnostics)).toBe(true);
  });

  it("does not treat unknown permissions as missing", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: PLATFORM.WIN32,
    });

    expect(diagnostics.windowsIntegrityLevel.status).toBe(NUTJS_PERMISSION_STATUS.UNKNOWN);
    expect(hasMissingNutJsPermissions(diagnostics)).toBe(false);
  });

  it("does not treat non-applicable permissions as missing", () => {
    const diagnostics = diagnoseNutJsPermissions({
      platform: "aix",
    });

    expect(diagnostics.macosAccessibility.status).toBe(NUTJS_PERMISSION_STATUS.NOT_APPLICABLE);
    expect(diagnostics.linuxDisplayBackend.status).toBe(NUTJS_PERMISSION_STATUS.NOT_APPLICABLE);
    expect(diagnostics.windowsIntegrityLevel.status).toBe(NUTJS_PERMISSION_STATUS.NOT_APPLICABLE);
    expect(hasMissingNutJsPermissions(diagnostics)).toBe(false);
  });
});
