import { ENV_KEY } from "@/constants/env-keys";
import { NUTJS_EXECUTION_OUTCOME } from "@/constants/nutjs-execution";
import {
  NUTJS_PERMISSION_STATUS,
  NUTJS_WINDOWS_INTEGRITY_LEVEL,
} from "@/constants/nutjs-permissions";
import { PLATFORM } from "@/constants/platform";
import { NUTJS_EXECUTION_STAGE } from "@/constants/platform-fallback-precedence";
import {
  getNutJsExecutionFallbackPrecedence,
  isNutJsActionAllowlisted,
  resolveNutJsExecutionPolicy,
  runNutJsActionWithGate,
} from "@/utils/nutjs-execution-gate.utils";
import { describe, expect, it, vi } from "vitest";

const ACTION_ID = "mouse.click";

describe("nutjs execution gate", () => {
  it("exposes canonical NutJS execution fallback order", () => {
    expect(getNutJsExecutionFallbackPrecedence()).toEqual([
      NUTJS_EXECUTION_STAGE.FEATURE_FLAG,
      NUTJS_EXECUTION_STAGE.ALLOWLIST,
      NUTJS_EXECUTION_STAGE.CAPABILITY,
      NUTJS_EXECUTION_STAGE.PERMISSION_DIAGNOSTICS,
      NUTJS_EXECUTION_STAGE.EXECUTION,
    ]);
  });

  it("defaults to disabled policy with empty allowlist", () => {
    const policy = resolveNutJsExecutionPolicy({});

    expect(policy.enabled).toBe(false);
    expect(policy.allowlist).toEqual([]);
  });

  it("normalizes allowlist entries with trimming and case folding", () => {
    const policy = resolveNutJsExecutionPolicy({
      [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: " TRUE ",
      [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: " Mouse.Click , KEYBOARD.Type ,, ",
    });

    expect(policy.enabled).toBe(true);
    expect(policy.allowlist).toEqual(["mouse.click", "keyboard.type"]);
  });

  it("deduplicates normalized allowlist entries while preserving order", () => {
    const policy = resolveNutJsExecutionPolicy({
      [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
      [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]:
        "mouse.click, MOUSE.CLICK ,*, keyboard.type, *, keyboard.type",
    });

    expect(policy.allowlist).toEqual(["mouse.click", "*", "keyboard.type"]);
  });

  it("returns not allowlisted when feature is enabled without allowlist", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
      },
      capability: {
        platform: PLATFORM.LINUX,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.NOT_ALLOWLISTED);
    expect(result.executed).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it("allows explicit action ids from the allowlist", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: ACTION_ID,
        [ENV_KEY.DISPLAY]: ":0",
      },
      capability: {
        platform: PLATFORM.LINUX,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.EXECUTED);
    expect(result.executed).toBe(true);
    expect(result.result).toBe("executed");
    expect(result.diagnostics?.ready).toBe(true);
    expect(result.diagnostics?.linuxDisplayBackend.status).toBe(NUTJS_PERMISSION_STATUS.GRANTED);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("supports wildcard allowlist entries", () => {
    const policy = resolveNutJsExecutionPolicy({
      [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
      [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: "*",
    });

    expect(isNutJsActionAllowlisted("keyboard.type", policy)).toBe(true);
  });

  it("supports wildcard allowlist entries with padding", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: "KEYBOARD.TYPE",
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: " * ",
        [ENV_KEY.DISPLAY]: ":0",
      },
      capability: {
        platform: PLATFORM.LINUX,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.EXECUTED);
    expect(result.executed).toBe(true);
    expect(result.result).toBe("executed");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("executes allowlisted actions with normalized casing", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: " TRUE ",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: " MOUSE.CLICK ",
        [ENV_KEY.DISPLAY]: ":0",
      },
      capability: {
        platform: PLATFORM.LINUX,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.EXECUTED);
    expect(result.executed).toBe(true);
    expect(result.result).toBe("executed");
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("returns capability no-op outcome when runtime is unavailable", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: ACTION_ID,
      },
      capability: {
        platform: PLATFORM.LINUX,
        hasRuntime: false,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.CAPABILITY_NOOP);
    expect(result.executed).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it("returns permission-missing outcome for linux headless sessions", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: ACTION_ID,
      },
      capability: {
        platform: PLATFORM.LINUX,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.PERMISSION_MISSING);
    expect(result.executed).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(result.diagnostics?.linuxDisplayBackend.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });

  it("returns permission-missing when macOS accessibility is denied", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: ACTION_ID,
      },
      capability: {
        platform: PLATFORM.DARWIN,
        hasRuntime: true,
      },
      diagnostics: {
        macosAccessibilityGranted: false,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.PERMISSION_MISSING);
    expect(result.executed).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(result.diagnostics?.macosAccessibility.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });

  it("returns permission-missing for low windows integrity level", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: ACTION_ID,
      },
      capability: {
        platform: PLATFORM.WIN32,
        hasRuntime: true,
      },
      diagnostics: {
        windowsIntegrityLevel: NUTJS_WINDOWS_INTEGRITY_LEVEL.LOW,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.PERMISSION_MISSING);
    expect(result.executed).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(result.diagnostics?.windowsIntegrityLevel.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });

  it("does not block execution when permission state is unknown", async () => {
    const action = vi.fn(async () => "executed");
    const result = await runNutJsActionWithGate({
      actionId: ACTION_ID,
      action,
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: ACTION_ID,
      },
      capability: {
        platform: PLATFORM.WIN32,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.EXECUTED);
    expect(result.executed).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
