import { TRUTHY_STRINGS } from "@/constants/boolean-strings";
import { ENV_KEY } from "@/constants/env-keys";
import {
  NUTJS_ALLOWLIST_SEPARATOR,
  NUTJS_ALLOWLIST_WILDCARD,
  NUTJS_EXECUTION_OUTCOME,
  type NutJsExecutionOutcome,
} from "@/constants/nutjs-execution";
import { EnvManager } from "@/utils/env/env.utils";
import {
  type NutJsCapability,
  type NutJsCapabilityOptions,
  detectNutJsCapability,
  withNutJsCapabilityNoop,
} from "@/utils/nutjs-capability.utils";

export interface NutJsExecutionPolicy {
  enabled: boolean;
  allowlist: string[];
}

export interface NutJsExecutionResult<T> {
  outcome: NutJsExecutionOutcome;
  executed: boolean;
  result: T | null;
  capability?: NutJsCapability;
}

export interface RunNutJsActionOptions<T> {
  actionId: string;
  action: () => Promise<T>;
  env?: NodeJS.ProcessEnv;
  capability?: NutJsCapabilityOptions;
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
  return raw
    .split(NUTJS_ALLOWLIST_SEPARATOR)
    .map((entry) => normalizeActionId(entry))
    .filter((entry) => entry.length > 0);
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
  const result = await withNutJsCapabilityNoop(capability, options.action);
  if (result === null) {
    return {
      outcome: NUTJS_EXECUTION_OUTCOME.CAPABILITY_NOOP,
      executed: false,
      result,
      capability,
    };
  }
  return {
    outcome: NUTJS_EXECUTION_OUTCOME.EXECUTED,
    executed: true,
    result,
    capability,
  };
};
