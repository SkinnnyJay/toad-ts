import { TRUTHY_STRINGS } from "@/constants/boolean-strings";
import { ENV_KEY } from "@/constants/env-keys";
import {
  NUTJS_ALLOWLIST_SEPARATOR,
  NUTJS_ALLOWLIST_WILDCARD,
  NUTJS_EXECUTION_OUTCOME,
  type NutJsExecutionOutcome,
} from "@/constants/nutjs-execution";
import { NUTJS_PERMISSION_STATUS } from "@/constants/nutjs-permissions";
import {
  NUTJS_EXECUTION_FALLBACK_PRECEDENCE,
  type NutJsExecutionStage,
} from "@/constants/platform-fallback-precedence";
import { EnvManager } from "@/utils/env/env.utils";
import {
  type NutJsCapability,
  type NutJsCapabilityOptions,
  detectNutJsCapability,
} from "@/utils/nutjs-capability.utils";
import {
  type NutJsPermissionDiagnostics,
  type NutJsPermissionDiagnosticsOptions,
  diagnoseNutJsPermissions,
} from "@/utils/nutjs-permission-diagnostics.utils";

export interface NutJsExecutionPolicy {
  enabled: boolean;
  allowlist: string[];
}

export interface NutJsExecutionResult<T> {
  outcome: NutJsExecutionOutcome;
  executed: boolean;
  result: T | null;
  capability?: NutJsCapability;
  diagnostics?: NutJsPermissionDiagnostics;
}

export interface RunNutJsActionOptions<T> {
  actionId: string;
  action: () => Promise<T>;
  env?: NodeJS.ProcessEnv;
  capability?: NutJsCapabilityOptions;
  diagnostics?: Omit<NutJsPermissionDiagnosticsOptions, "platform" | "env">;
}

const normalizeActionId = (actionId: string): string => actionId.trim().toLowerCase();

const resolveNutJsEnabled = (env: NodeJS.ProcessEnv): boolean => {
  const raw = env[ENV_KEY.TOADSTOOL_NUTJS_ENABLED];
  if (!raw) {
    return false;
  }
  return TRUTHY_STRINGS.has(raw.trim().toLowerCase());
};

const resolveNutJsAllowlist = (env: NodeJS.ProcessEnv): string[] => {
  const raw = env[ENV_KEY.TOADSTOOL_NUTJS_ALLOWLIST];
  if (!raw) {
    return [];
  }
  const normalizedEntries = raw
    .split(NUTJS_ALLOWLIST_SEPARATOR)
    .map((entry) => normalizeActionId(entry))
    .filter((entry) => entry.length > 0);
  const uniqueEntries = new Set<string>();
  for (const entry of normalizedEntries) {
    if (uniqueEntries.has(entry)) {
      continue;
    }
    uniqueEntries.add(entry);
  }
  if (uniqueEntries.has(NUTJS_ALLOWLIST_WILDCARD)) {
    return [NUTJS_ALLOWLIST_WILDCARD];
  }
  return [...uniqueEntries];
};

export const resolveNutJsExecutionPolicy = (
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): NutJsExecutionPolicy => {
  return {
    enabled: resolveNutJsEnabled(env),
    allowlist: resolveNutJsAllowlist(env),
  };
};

export const isNutJsActionAllowlisted = (
  actionId: string,
  policy: NutJsExecutionPolicy
): boolean => {
  const normalized = normalizeActionId(actionId);
  return (
    policy.allowlist.includes(NUTJS_ALLOWLIST_WILDCARD) || policy.allowlist.includes(normalized)
  );
};

export const runNutJsActionWithGate = async <T>(
  options: RunNutJsActionOptions<T>
): Promise<NutJsExecutionResult<T>> => {
  const env = options.env ?? EnvManager.getInstance().getSnapshot();
  const policy = resolveNutJsExecutionPolicy(env);
  if (!policy.enabled) {
    return {
      outcome: NUTJS_EXECUTION_OUTCOME.DISABLED,
      executed: false,
      result: null,
    };
  }
  if (!isNutJsActionAllowlisted(options.actionId, policy)) {
    return {
      outcome: NUTJS_EXECUTION_OUTCOME.NOT_ALLOWLISTED,
      executed: false,
      result: null,
    };
  }
  const capability = detectNutJsCapability(options.capability);
  const diagnostics = diagnoseNutJsPermissions({
    platform: capability.platform,
    env,
    ...options.diagnostics,
  });
  if (capability.noOp) {
    return {
      outcome: NUTJS_EXECUTION_OUTCOME.CAPABILITY_NOOP,
      executed: false,
      result: null,
      capability,
      diagnostics,
    };
  }
  const hasMissingPermission =
    diagnostics.macosAccessibility.status === NUTJS_PERMISSION_STATUS.MISSING ||
    diagnostics.linuxDisplayBackend.status === NUTJS_PERMISSION_STATUS.MISSING ||
    diagnostics.windowsIntegrityLevel.status === NUTJS_PERMISSION_STATUS.MISSING;
  if (hasMissingPermission) {
    return {
      outcome: NUTJS_EXECUTION_OUTCOME.PERMISSION_MISSING,
      executed: false,
      result: null,
      capability,
      diagnostics,
    };
  }
  const result = await options.action();
  return {
    outcome: NUTJS_EXECUTION_OUTCOME.EXECUTED,
    executed: true,
    result,
    capability,
    diagnostics,
  };
};

export const getNutJsExecutionFallbackPrecedence = (): readonly NutJsExecutionStage[] =>
  NUTJS_EXECUTION_FALLBACK_PRECEDENCE;
