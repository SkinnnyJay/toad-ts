import { ENV_KEY } from "@/constants/env-keys";
import { NUTJS_EXECUTION_OUTCOME } from "@/constants/nutjs-execution";
import {
  NUTJS_PERMISSION_STATUS,
  NUTJS_WINDOWS_INTEGRITY_LEVEL,
} from "@/constants/nutjs-permissions";
import { PLATFORM } from "@/constants/platform";
import { detectNutJsCapability } from "@/utils/nutjs-capability.utils";
import { runNutJsActionWithGate } from "@/utils/nutjs-execution-gate.utils";
import { diagnoseNutJsPermissions } from "@/utils/nutjs-permission-diagnostics.utils";
import { describe, expect, it } from "vitest";

const NUTJS_SMOKE_ACTION = "nutjs.smoke";

const createAllowlistedNutJsEnv = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
    [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: NUTJS_SMOKE_ACTION,
  };
  if (process.platform === PLATFORM.LINUX) {
    env[ENV_KEY.DISPLAY] = ":0";
  }
  return env;
};

describe("nutjs cross-platform smoke checks", () => {
  it("returns disabled outcome when feature flag is off", async () => {
    let actionInvoked = false;
    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async () => {
        actionInvoked = true;
        return "executed";
      },
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "false",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: NUTJS_SMOKE_ACTION,
      },
      capability: {
        platform: process.platform,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.DISABLED);
    expect(result.executed).toBe(false);
    expect(result.capability).toBeUndefined();
    expect(result.diagnostics).toBeUndefined();
    expect(actionInvoked).toBe(false);
  });

  it("keeps gated execution in deterministic no-op mode without runtime", async () => {
    const capability = detectNutJsCapability({
      platform: process.platform,
      hasRuntime: false,
    });
    const diagnostics = diagnoseNutJsPermissions({
      platform: process.platform,
      env: process.env,
    });
    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async () => "executed",
      env: createAllowlistedNutJsEnv(),
      capability: {
        platform: process.platform,
        hasRuntime: false,
      },
    });

    expect(capability.noOp).toBe(true);
    expect(diagnostics.platform).toBe(process.platform);
    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.CAPABILITY_NOOP);
    expect(result.diagnostics?.platform).toBe(process.platform);
  });

  it("runs allowlisted action when runtime simulation is enabled", async () => {
    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async () => "executed",
      env: createAllowlistedNutJsEnv(),
      capability: {
        platform: process.platform,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.EXECUTED);
    expect(result.executed).toBe(true);
    expect(result.result).toBe("executed");
  });

  it("keeps executed outcome when action resolves null", async () => {
    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async (): Promise<null> => null,
      env: createAllowlistedNutJsEnv(),
      capability: {
        platform: process.platform,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.EXECUTED);
    expect(result.executed).toBe(true);
    expect(result.result).toBeNull();
  });

  it("returns non-applicable diagnostics for unsupported platform simulation", async () => {
    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async () => "executed",
      env: createAllowlistedNutJsEnv(),
      capability: {
        platform: "aix",
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.CAPABILITY_NOOP);
    expect(result.executed).toBe(false);
    expect(result.diagnostics?.macosAccessibility.status).toBe(
      NUTJS_PERMISSION_STATUS.NOT_APPLICABLE
    );
    expect(result.diagnostics?.linuxDisplayBackend.status).toBe(
      NUTJS_PERMISSION_STATUS.NOT_APPLICABLE
    );
    expect(result.diagnostics?.windowsIntegrityLevel.status).toBe(
      NUTJS_PERMISSION_STATUS.NOT_APPLICABLE
    );
  });

  it("returns permission-missing for linux runtime without display backend", async () => {
    if (process.platform !== PLATFORM.LINUX) {
      return;
    }

    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async () => "executed",
      env: {
        [ENV_KEY.TOADSTOOL_NUTJS_ENABLED]: "true",
        [ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST]: NUTJS_SMOKE_ACTION,
      },
      capability: {
        platform: process.platform,
        hasRuntime: true,
      },
    });

    expect(result.outcome).toBe(NUTJS_EXECUTION_OUTCOME.PERMISSION_MISSING);
    expect(result.executed).toBe(false);
    expect(result.result).toBeNull();
    expect(result.diagnostics?.linuxDisplayBackend.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });

  it("returns permission-missing for macOS accessibility denial simulation", async () => {
    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async () => "executed",
      env: createAllowlistedNutJsEnv(),
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
    expect(result.result).toBeNull();
    expect(result.diagnostics?.macosAccessibility.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });

  it("returns permission-missing for windows low integrity simulation", async () => {
    const result = await runNutJsActionWithGate({
      actionId: NUTJS_SMOKE_ACTION,
      action: async () => "executed",
      env: createAllowlistedNutJsEnv(),
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
    expect(result.result).toBeNull();
    expect(result.diagnostics?.windowsIntegrityLevel.status).toBe(NUTJS_PERMISSION_STATUS.MISSING);
  });
});
