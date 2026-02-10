import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { CONFIG_FILE, PROJECT_CONFIG_FILES } from "@/constants/config-files";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { HOOK_EVENT, HOOK_EVENT_VALUES } from "@/constants/hook-events";
import { HOOK_TYPE } from "@/constants/hook-types";
import { KEYBIND_ACTION } from "@/constants/keybind-actions";
import { KEYBIND } from "@/constants/keybinds";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { findUp } from "find-up";
import { z } from "zod";

const logger = createClassLogger("AppConfig");

const DEFAULT_LEADER_KEY = "ctrl+x";

const defaultKeybinds = {
  [KEYBIND_ACTION.FOCUS_CHAT]: "alt+`",
  [KEYBIND_ACTION.FOCUS_FILES]: "ctrl+1,meta+1,ctrl+f,meta+f",
  [KEYBIND_ACTION.FOCUS_PLAN]: "ctrl+2,meta+2",
  [KEYBIND_ACTION.FOCUS_CONTEXT]: "ctrl+3,meta+3",
  [KEYBIND_ACTION.FOCUS_SESSIONS]: "ctrl+4,meta+4",
  [KEYBIND_ACTION.FOCUS_AGENT]: "ctrl+5,meta+5",
  [KEYBIND_ACTION.OPEN_HELP]: "ctrl+?,meta+?,ctrl+/,meta+/",
  [KEYBIND_ACTION.TOGGLE_SESSIONS]: "ctrl+s",
  [KEYBIND_ACTION.TOGGLE_BACKGROUND_TASKS]: "ctrl+b",
  [KEYBIND_ACTION.OPEN_THEMES]: `${KEYBIND.LEADER_TOKEN}t`,
  [KEYBIND_ACTION.OPEN_SETTINGS]: "none",
  [KEYBIND_ACTION.TOGGLE_TOOL_DETAILS]: `${KEYBIND.LEADER_TOKEN}d`,
  [KEYBIND_ACTION.TOGGLE_THINKING]: "none",
  [KEYBIND_ACTION.PERMISSION_MODE_CYCLE]: "shift+tab",
  [KEYBIND_ACTION.SESSION_CHILD_CYCLE]: `${KEYBIND.LEADER_TOKEN}right`,
  [KEYBIND_ACTION.SESSION_CHILD_CYCLE_REVERSE]: `${KEYBIND.LEADER_TOKEN}left`,
} as const;

export const keybindsSchema = z
  .object({
    leader: z.string().min(1).optional(),
    bindings: z.record(z.string()).optional(),
  })
  .strict();

export const defaultsSchema = z
  .object({
    agent: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
  })
  .strict();

export const vimSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .strict();

const hookDefinitionSchema = z
  .object({
    type: z.enum([HOOK_TYPE.COMMAND, HOOK_TYPE.PROMPT]),
    command: z.string().min(1).optional(),
    prompt: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === HOOK_TYPE.COMMAND && !value.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Command hook requires a command value.",
      });
    }
    if (value.type === HOOK_TYPE.PROMPT && !value.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prompt hook requires a prompt value.",
      });
    }
  });

const hookGroupSchema = z
  .object({
    matcher: z.string().min(1).optional(),
    hooks: z.array(hookDefinitionSchema).default([]),
  })
  .strict();

export const hooksSchema = z
  .object({
    [HOOK_EVENT.SESSION_START]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.PRE_TOOL_USE]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.POST_TOOL_USE]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.PERMISSION_REQUEST]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.STOP]: z.array(hookGroupSchema).optional(),
  })
  .strict();

const routingRuleSchema = z
  .object({
    matcher: z.string().min(1),
    agentId: z.string().min(1),
  })
  .strict();

export const routingSchema = z
  .object({
    rules: z.array(routingRuleSchema).default([]),
  })
  .strict();

export const appConfigSchema = z
  .object({
    defaults: defaultsSchema.optional(),
    keybinds: keybindsSchema.optional(),
    vim: vimSchema.optional(),
    hooks: hooksSchema.optional(),
    routing: routingSchema.optional(),
  })
  .strict();

export type KeybindConfig = z.infer<typeof keybindsSchema>;
export type AppConfigDefaults = z.infer<typeof defaultsSchema>;
export type VimConfig = z.infer<typeof vimSchema>;
export type HookDefinition = z.infer<typeof hookDefinitionSchema>;
export type HookGroup = z.infer<typeof hookGroupSchema>;
export type HooksConfig = z.infer<typeof hooksSchema>;
export type RoutingRule = z.infer<typeof routingRuleSchema>;
export type RoutingConfig = z.infer<typeof routingSchema>;
export type AppConfigInput = z.infer<typeof appConfigSchema>;

export interface ResolvedKeybindConfig {
  leader: string;
  bindings: Record<string, string>;
}

export interface AppConfig {
  defaults?: AppConfigDefaults;
  keybinds: ResolvedKeybindConfig;
  vim: {
    enabled: boolean;
  };
  hooks: HooksConfig;
  routing: RoutingConfig;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  defaults: undefined,
  keybinds: {
    leader: DEFAULT_LEADER_KEY,
    bindings: { ...defaultKeybinds },
  },
  vim: {
    enabled: false,
  },
  hooks: {},
  routing: {
    rules: [],
  },
};

export interface LoadAppConfigOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}

const CONFIG_VARIABLE_PATTERN = /\{(env|file):([^}]+)\}/g;

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const readConfigFile = async (
  filePath: string,
  env: NodeJS.ProcessEnv
): Promise<unknown | null> => {
  try {
    const contents = await readFile(filePath, ENCODING.UTF8);
    const parsed = parseJsonWithComments(contents);
    return resolveVariables(parsed, env, path.dirname(filePath));
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return null;
    }
    throw error;
  }
};

const resolveGlobalConfigPath = (homeDir: string): string => {
  return path.join(
    homeDir,
    CONFIG_FILE.GLOBAL_CONFIG_DIR,
    CONFIG_FILE.GLOBAL_APP_DIR,
    CONFIG_FILE.GLOBAL_CONFIG_FILE
  );
};

const parseJsonWithComments = (raw: string): unknown => {
  const withoutComments = raw.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const withoutTrailing = withoutComments.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(withoutTrailing);
};

const resolveVariables = async (
  value: unknown,
  env: NodeJS.ProcessEnv,
  baseDir: string
): Promise<unknown> => {
  if (typeof value === "string") {
    return resolveStringVariables(value, env, baseDir);
  }
  if (Array.isArray(value)) {
    const next: unknown[] = [];
    for (const entry of value) {
      next.push(await resolveVariables(entry, env, baseDir));
    }
    return next;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    const next: Record<string, unknown> = {};
    for (const [key, entry] of entries) {
      next[key] = await resolveVariables(entry, env, baseDir);
    }
    return next;
  }
  return value;
};

const resolveStringVariables = async (
  raw: string,
  env: NodeJS.ProcessEnv,
  baseDir: string
): Promise<string> => {
  const matches = Array.from(raw.matchAll(CONFIG_VARIABLE_PATTERN));
  let resolved = raw;
  for (const match of matches) {
    const [token, kind, value] = match;
    if (!token || !kind || !value) {
      continue;
    }
    if (kind === "env") {
      resolved = resolved.replace(token, env[value] ?? "");
      continue;
    }
    if (kind === "file") {
      const filePath = path.isAbsolute(value) ? value : path.join(baseDir, value);
      const contents = await readFile(filePath, ENCODING.UTF8);
      resolved = resolved.replace(token, contents.trim());
    }
  }
  return resolved;
};

const parseConfig = (raw: unknown, filePath: string): AppConfigInput => {
  try {
    return appConfigSchema.parse(raw);
  } catch (error) {
    if (error instanceof Error) {
      error.message = `Invalid config at ${filePath}: ${error.message}`;
    }
    throw error;
  }
};

const mergeHooksConfig = (base: HooksConfig, override?: HooksConfig): HooksConfig => {
  if (!override) {
    return base;
  }
  const merged: HooksConfig = { ...base };
  for (const event of HOOK_EVENT_VALUES) {
    const baseEntries = base[event] ?? [];
    const overrideEntries = override[event] ?? [];
    if (overrideEntries.length > 0) {
      merged[event] = [...baseEntries, ...overrideEntries];
    }
  }
  return merged;
};

const mergeRoutingConfig = (base: RoutingConfig, override?: RoutingConfig): RoutingConfig => {
  if (!override) {
    return base;
  }
  return {
    rules: [...base.rules, ...override.rules],
  };
};

export const mergeAppConfig = (base: AppConfig, override: AppConfigInput): AppConfig => {
  return {
    defaults: {
      ...(base.defaults ?? {}),
      ...(override.defaults ?? {}),
    },
    keybinds: {
      leader: override.keybinds?.leader ?? base.keybinds.leader,
      bindings: {
        ...base.keybinds.bindings,
        ...(override.keybinds?.bindings ?? {}),
      },
    },
    vim: {
      enabled: override.vim?.enabled ?? base.vim.enabled,
    },
    hooks: mergeHooksConfig(base.hooks, override.hooks),
    routing: mergeRoutingConfig(base.routing, override.routing),
  };
};

const loadProjectConfig = async (
  cwd: string,
  env: NodeJS.ProcessEnv
): Promise<AppConfigInput | null> => {
  const match = await findUp(PROJECT_CONFIG_FILES, { cwd });
  if (!match) {
    return null;
  }
  const raw = await readConfigFile(match, env);
  return raw ? parseConfig(raw, match) : null;
};

const loadGlobalConfig = async (
  homeDir: string,
  env: NodeJS.ProcessEnv
): Promise<AppConfigInput | null> => {
  const filePath = resolveGlobalConfigPath(homeDir);
  const raw = await readConfigFile(filePath, env);
  return raw ? parseConfig(raw, filePath) : null;
};

const loadEnvConfig = async (
  env: NodeJS.ProcessEnv,
  baseDir: string
): Promise<AppConfigInput | null> => {
  const content = env[ENV_KEY.TOADSTOOL_CONFIG_CONTENT];
  if (content && content.trim().length > 0) {
    const raw = parseJsonWithComments(content);
    const resolved = await resolveVariables(raw, env, baseDir);
    return parseConfig(resolved, ENV_KEY.TOADSTOOL_CONFIG_CONTENT);
  }
  const filePath = env[ENV_KEY.TOADSTOOL_CONFIG_PATH];
  if (!filePath) {
    return null;
  }
  const raw = await readConfigFile(filePath, env);
  return raw ? parseConfig(raw, filePath) : null;
};

export const loadAppConfig = async (options: LoadAppConfigOptions = {}): Promise<AppConfig> => {
  const env = options.env ?? EnvManager.getInstance().getSnapshot();
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? homedir();

  const configs: AppConfigInput[] = [];
  const globalConfig = await loadGlobalConfig(homeDir, env);
  if (globalConfig) {
    configs.push(globalConfig);
  }

  const projectConfig = await loadProjectConfig(cwd, env);
  if (projectConfig) {
    configs.push(projectConfig);
  }

  const envConfig = await loadEnvConfig(env, cwd);
  if (envConfig) {
    configs.push(envConfig);
  }

  const merged = configs.reduce<AppConfig>(
    (current, config) => mergeAppConfig(current, config),
    DEFAULT_APP_CONFIG
  );
  logger.debug("Loaded config", {
    sources: configs.length,
    hasDefaults: Boolean(merged.defaults),
    leader: merged.keybinds.leader,
  });
  return merged;
};

const serializeConfig = (config: AppConfig): AppConfigInput => {
  return {
    defaults: config.defaults,
    keybinds: {
      leader: config.keybinds.leader,
      bindings: config.keybinds.bindings,
    },
    vim: {
      enabled: config.vim.enabled,
    },
    hooks: config.hooks,
    routing: config.routing,
  };
};

export interface SaveAppConfigOptions {
  homeDir?: string;
}

export const saveAppConfig = async (
  config: AppConfig,
  options: SaveAppConfigOptions = {}
): Promise<void> => {
  const homeDir = options.homeDir ?? homedir();
  const filePath = resolveGlobalConfigPath(homeDir);
  await mkdir(path.dirname(filePath), { recursive: true });
  const payload = serializeConfig(config);
  const contents = JSON.stringify(payload, null, 2);
  await writeFile(filePath, contents, ENCODING.UTF8);
};
