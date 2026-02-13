import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";
import { FILE_PATH } from "@/constants/file-paths";
import { PERMISSION } from "@/constants/permissions";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { CLI_AGENT_MODE } from "@/types/cli-agent.types";
import { EnvManager } from "@/utils/env/env.utils";
import { z } from "zod";

const ENV_PATTERN = /\$(\w+)|\$\{([^}]+)\}/g;
const DEFAULT_CONFIG_FILENAME = "harnesses.json";

const permissionValueSchema = z.enum([PERMISSION.ALLOW, PERMISSION.DENY, PERMISSION.ASK]);

const toolPermissionsSchema = z
  .object({
    [TOOL_KIND.READ]: permissionValueSchema.optional(),
    [TOOL_KIND.EDIT]: permissionValueSchema.optional(),
    [TOOL_KIND.DELETE]: permissionValueSchema.optional(),
    [TOOL_KIND.MOVE]: permissionValueSchema.optional(),
    [TOOL_KIND.SEARCH]: permissionValueSchema.optional(),
    [TOOL_KIND.EXECUTE]: permissionValueSchema.optional(),
    [TOOL_KIND.THINK]: permissionValueSchema.optional(),
    [TOOL_KIND.FETCH]: permissionValueSchema.optional(),
    [TOOL_KIND.SWITCH_MODE]: permissionValueSchema.optional(),
    [TOOL_KIND.OTHER]: permissionValueSchema.optional(),
  })
  .strict()
  .optional();

const cursorHarnessOptionsSchema = z
  .object({
    model: z.string().min(1).optional(),
    mode: z.enum([CLI_AGENT_MODE.AGENT, CLI_AGENT_MODE.PLAN, CLI_AGENT_MODE.ASK]).optional(),
    force: z.boolean().optional(),
    sandbox: z.boolean().optional(),
    browser: z.boolean().optional(),
    approveMcps: z.boolean().optional(),
  })
  .strict()
  .optional();

const harnessFileDefinitionSchema = z
  .object({
    name: z.string().min(1).optional(),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    cwd: z.string().min(1).optional(),
    description: z.string().optional(),
    permissions: toolPermissionsSchema,
    cursor: cursorHarnessOptionsSchema,
  })
  .strict();

export type HarnessFileDefinition = z.infer<typeof harnessFileDefinitionSchema>;

export const harnessFileSchema = z
  .object({
    defaultHarness: z.string().min(1).optional(),
    harnesses: z.record(harnessFileDefinitionSchema).default({}),
  })
  .strict();

export type HarnessFileConfig = z.infer<typeof harnessFileSchema>;

export const harnessConfigSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    env: z.record(z.string()).default({}),
    cwd: z.string().min(1).optional(),
    description: z.string().optional(),
    permissions: toolPermissionsSchema,
    cursor: cursorHarnessOptionsSchema,
  })
  .strict();

export type HarnessConfig = z.infer<typeof harnessConfigSchema>;

export interface HarnessConfigLoaderOptions {
  readonly projectRoot?: string;
  readonly configPath?: string;
  readonly harnessId?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly homedir?: string;
}

export interface HarnessConfigResult {
  readonly harnessId: string;
  readonly harness: HarnessConfig;
  readonly harnesses: Record<string, HarnessConfig>;
}

const parseHarnessFile = (raw: unknown, filePath: string): HarnessFileConfig => {
  try {
    return harnessFileSchema.parse(raw);
  } catch (error) {
    if (error instanceof Error) {
      error.message = `Invalid harness config at ${filePath}: ${error.message}`;
    }
    throw error;
  }
};

const readHarnessFile = async (filePath: string): Promise<HarnessFileConfig | null> => {
  try {
    const contents = await readFile(filePath, ENCODING.UTF8);
    const parsed: unknown = JSON.parse(contents);
    return parseHarnessFile(parsed, filePath);
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return null;
    }
    throw error;
  }
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const mergeDefinitions = (
  base: HarnessFileDefinition | undefined,
  override: HarnessFileDefinition | undefined
): HarnessFileDefinition => {
  const mergedEnv = {
    ...(base?.env ?? {}),
    ...(override?.env ?? {}),
  };
  const mergedPermissions = {
    ...(base?.permissions ?? {}),
    ...(override?.permissions ?? {}),
  };
  const mergedCursorOptions = {
    ...(base?.cursor ?? {}),
    ...(override?.cursor ?? {}),
  };

  return {
    name: override?.name ?? base?.name,
    command: override?.command ?? base?.command,
    args: override?.args ?? base?.args,
    env: Object.keys(mergedEnv).length > 0 ? mergedEnv : undefined,
    permissions: Object.keys(mergedPermissions).length > 0 ? mergedPermissions : undefined,
    cursor: Object.keys(mergedCursorOptions).length > 0 ? mergedCursorOptions : undefined,
    cwd: override?.cwd ?? base?.cwd,
    description: override?.description ?? base?.description,
  };
};

const mergeHarnessFiles = (
  projectConfig: HarnessFileConfig | null,
  userConfig: HarnessFileConfig | null
): HarnessFileConfig => {
  const harnesses: Record<string, HarnessFileDefinition> = {};

  for (const [id, definition] of Object.entries(projectConfig?.harnesses ?? {})) {
    harnesses[id] = definition;
  }

  for (const [id, definition] of Object.entries(userConfig?.harnesses ?? {})) {
    harnesses[id] = mergeDefinitions(harnesses[id], definition);
  }

  return {
    defaultHarness: userConfig?.defaultHarness ?? projectConfig?.defaultHarness,
    harnesses,
  };
};

const resolveHarnessConfig = (
  id: string,
  definition: HarnessFileDefinition,
  projectRoot: string
): HarnessConfig => {
  return harnessConfigSchema.parse({
    id,
    name: definition.name,
    command: definition.command,
    args: definition.args ?? [],
    env: definition.env ?? {},
    cwd: definition.cwd ?? projectRoot,
    description: definition.description,
    permissions: definition.permissions,
    cursor: definition.cursor,
  });
};

const expandEnvString = (value: string, env: NodeJS.ProcessEnv): string => {
  return value.replace(ENV_PATTERN, (_, direct, braced) => {
    const key = direct ?? braced;
    return key ? (env[key] ?? "") : "";
  });
};

const expandHarnessConfig = (config: HarnessConfig, env: NodeJS.ProcessEnv): HarnessConfig => {
  const expandedEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.env)) {
    expandedEnv[key] = expandEnvString(value, env);
  }

  return {
    ...config,
    command: expandEnvString(config.command, env),
    args: config.args.map((arg) => expandEnvString(arg, env)),
    env: expandedEnv,
    cwd: config.cwd ? expandEnvString(config.cwd, env) : config.cwd,
    permissions: config.permissions,
    cursor: config.cursor
      ? {
          ...config.cursor,
          model: config.cursor.model ? expandEnvString(config.cursor.model, env) : undefined,
        }
      : undefined,
  };
};

const resolveHarnessId = (
  cliHarnessId: string | undefined,
  userDefault: string | undefined,
  projectDefault: string | undefined,
  availableIds: string[]
): string => {
  if (cliHarnessId) {
    return cliHarnessId;
  }
  if (userDefault) {
    return userDefault;
  }
  if (projectDefault) {
    return projectDefault;
  }
  if (availableIds.length === 1) {
    const [only] = availableIds;
    if (only) {
      return only;
    }
  }
  throw new Error("No default harness configured.");
};

export const loadHarnessConfig = async (
  options: HarnessConfigLoaderOptions = {}
): Promise<HarnessConfigResult> => {
  const projectRoot = options.projectRoot ?? process.cwd();
  const projectPath =
    options.configPath ?? path.join(projectRoot, FILE_PATH.TOADSTOOL_DIR, DEFAULT_CONFIG_FILENAME);
  const userPath = path.join(
    options.homedir ?? homedir(),
    FILE_PATH.TOADSTOOL_DIR,
    DEFAULT_CONFIG_FILENAME
  );
  const env = options.env ?? EnvManager.getInstance().getSnapshot();

  const [projectConfig, userConfig] = await Promise.all([
    readHarnessFile(projectPath),
    readHarnessFile(userPath),
  ]);

  const mergedConfig = mergeHarnessFiles(projectConfig, userConfig);
  const resolvedHarnesses: Record<string, HarnessConfig> = {};

  for (const [id, definition] of Object.entries(mergedConfig.harnesses)) {
    resolvedHarnesses[id] = expandHarnessConfig(
      resolveHarnessConfig(id, definition, projectRoot),
      env
    );
  }

  const availableIds = Object.keys(resolvedHarnesses);
  if (availableIds.length === 0) {
    throw new Error("No harnesses configured.");
  }

  const selectedId = resolveHarnessId(
    options.harnessId,
    userConfig?.defaultHarness,
    projectConfig?.defaultHarness,
    availableIds
  );

  const harness = resolvedHarnesses[selectedId];
  if (!harness) {
    throw new Error(`Harness '${selectedId}' not found.`);
  }

  return {
    harnessId: selectedId,
    harness,
    harnesses: resolvedHarnesses,
  };
};
