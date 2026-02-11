import { chmod, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { CURSOR_HOOK_EVENT, type CursorHookEvent } from "@/constants/cursor-hook-events";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { FILE_PATH } from "@/constants/file-paths";

const CURSOR_HOOK_CONFIG_FILE = "hooks.json";
const CURSOR_CONFIG_DIR = ".cursor";
const TOADSTOOL_HOOK_DIR = "hooks";
const TOADSTOOL_NODE_SHIM_FILE = "toadstool-hook.mjs";
const TOADSTOOL_BASH_SHIM_FILE = "toadstool-hook.sh";
const TOADSTOOL_HOOK_VERSION = 1;
const EXECUTABLE_MODE = 0o755;

export const CURSOR_HOOK_INSTALL_SCOPE = {
  PROJECT: "project",
  USER: "user",
} as const;

export type CursorHookInstallScope =
  (typeof CURSOR_HOOK_INSTALL_SCOPE)[keyof typeof CURSOR_HOOK_INSTALL_SCOPE];

export interface CursorHookCommandEntry {
  command: string;
  timeout?: number;
}

export interface CursorHooksFile {
  version: number;
  hooks: Record<string, CursorHookCommandEntry[]>;
}

export interface CursorHookInstallPaths {
  hooksFilePath: string;
  toadstoolHooksDir: string;
  nodeShimPath: string;
  bashShimPath: string;
}

export interface CursorHookInstallation {
  paths: CursorHookInstallPaths;
  previousHooksRaw: string | null;
  generatedCommand: string;
  generatedConfig: CursorHooksFile;
}

export interface GenerateCursorHooksConfigOptions {
  command: string;
  enabledEvents?: CursorHookEvent[];
}

export interface InstallCursorHooksOptions {
  scope?: CursorHookInstallScope;
  cwd?: string;
  homeDir?: string;
  socketTarget: string;
  useBashShim?: boolean;
  enabledEvents?: CursorHookEvent[];
}

const CURSOR_HOOK_TIMEOUT_SECONDS: Partial<Record<CursorHookEvent, number>> = {
  [CURSOR_HOOK_EVENT.SESSION_START]: 10,
  [CURSOR_HOOK_EVENT.PRE_TOOL_USE]: 30,
  [CURSOR_HOOK_EVENT.SUBAGENT_START]: 30,
  [CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION]: 60,
  [CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION]: 30,
  [CURSOR_HOOK_EVENT.BEFORE_READ_FILE]: 10,
  [CURSOR_HOOK_EVENT.BEFORE_SUBMIT_PROMPT]: 10,
  [CURSOR_HOOK_EVENT.STOP]: 10,
};

const ALL_CURSOR_HOOK_EVENTS: CursorHookEvent[] = Object.values(CURSOR_HOOK_EVENT);

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const readFileIfExists = async (filePath: string): Promise<string | null> => {
  try {
    return await readFile(filePath, ENCODING.UTF8);
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return null;
    }
    throw error;
  }
};

const removeFileIfExists = async (filePath: string): Promise<void> => {
  try {
    await rm(filePath);
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return;
    }
    throw error;
  }
};

const isCommandEntry = (value: unknown): value is CursorHookCommandEntry => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("command" in value) || typeof value.command !== "string") {
    return false;
  }
  if ("timeout" in value && typeof value.timeout !== "number") {
    return false;
  }
  return true;
};

const parseHooksFile = (raw: string | null): CursorHooksFile | null => {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const hooksValue = record.hooks;
  if (typeof hooksValue !== "object" || hooksValue === null) {
    return {
      version: TOADSTOOL_HOOK_VERSION,
      hooks: {},
    };
  }

  const hooksEntries: Record<string, CursorHookCommandEntry[]> = {};
  for (const [eventName, entry] of Object.entries(hooksValue)) {
    if (!Array.isArray(entry)) {
      continue;
    }
    hooksEntries[eventName] = entry.filter(isCommandEntry);
  }

  const version = typeof record.version === "number" ? record.version : TOADSTOOL_HOOK_VERSION;
  return {
    version,
    hooks: hooksEntries,
  };
};

const createNodeShimScript = (): string => `#!/usr/bin/env node
import { createConnection } from "node:net";
import { stdin, stdout } from "node:process";

const endpoint = process.env.${ENV_KEY.TOADSTOOL_HOOK_SOCKET};
const chunks = [];
stdin.on("data", (chunk) => chunks.push(chunk));
stdin.on("end", async () => {
  const payload = Buffer.concat(chunks).toString("utf8");
  if (!endpoint) {
    stdout.write("{}");
    return;
  }

  const failOpen = () => {
    stdout.write("{}");
  };

  try {
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      });
      const text = await response.text();
      stdout.write(text || "{}");
      return;
    }

    const client = createConnection(endpoint);
    let response = "";
    client.on("connect", () => {
      client.write(payload);
      client.end();
    });
    client.on("data", (chunk) => {
      response += chunk.toString("utf8");
    });
    client.on("end", () => {
      stdout.write(response || "{}");
    });
    client.on("error", failOpen);
  } catch {
    failOpen();
  }
});
`;

const createBashShimScript = (): string => `#!/usr/bin/env bash
set -euo pipefail

if [ -z "\${${ENV_KEY.TOADSTOOL_HOOK_SOCKET}:-}" ]; then
  printf '{}'
  exit 0
fi

PAYLOAD="$(cat)"
if [[ "\${${ENV_KEY.TOADSTOOL_HOOK_SOCKET}}" == http* ]]; then
  RESPONSE="$(curl -sS -X POST -H "content-type: application/json" --data "$PAYLOAD" "\${${ENV_KEY.TOADSTOOL_HOOK_SOCKET}}" || printf '{}')"
  printf '%s' "\${RESPONSE:-{}}"
  exit 0
fi

printf '{}'
`;

const formatJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const getGeneratedEntry = (command: string, eventName: CursorHookEvent): CursorHookCommandEntry => {
  const timeout = CURSOR_HOOK_TIMEOUT_SECONDS[eventName];
  if (timeout === undefined) {
    return { command };
  }
  return { command, timeout };
};

export const resolveCursorHookInstallPaths = (
  scope: CursorHookInstallScope = CURSOR_HOOK_INSTALL_SCOPE.PROJECT,
  options: { cwd?: string; homeDir?: string } = {}
): CursorHookInstallPaths => {
  const cwd = options.cwd ?? process.cwd();
  const homeDirectory = options.homeDir ?? homedir();
  const root = scope === CURSOR_HOOK_INSTALL_SCOPE.USER ? homeDirectory : cwd;

  const hooksFilePath = path.join(root, CURSOR_CONFIG_DIR, CURSOR_HOOK_CONFIG_FILE);
  const toadstoolRoot = path.join(root, FILE_PATH.TOADSTOOL_DIR);
  const toadstoolHooksDir = path.join(toadstoolRoot, TOADSTOOL_HOOK_DIR);
  return {
    hooksFilePath,
    toadstoolHooksDir,
    nodeShimPath: path.join(toadstoolHooksDir, TOADSTOOL_NODE_SHIM_FILE),
    bashShimPath: path.join(toadstoolHooksDir, TOADSTOOL_BASH_SHIM_FILE),
  };
};

export const generateCursorHooksConfig = ({
  command,
  enabledEvents,
}: GenerateCursorHooksConfigOptions): CursorHooksFile => {
  const events = enabledEvents ?? ALL_CURSOR_HOOK_EVENTS;
  const hooks: Record<string, CursorHookCommandEntry[]> = {};
  for (const eventName of events) {
    hooks[eventName] = [getGeneratedEntry(command, eventName)];
  }
  return {
    version: TOADSTOOL_HOOK_VERSION,
    hooks,
  };
};

export const mergeCursorHooksConfig = (
  existingConfig: CursorHooksFile | null,
  generatedConfig: CursorHooksFile
): CursorHooksFile => {
  const base = existingConfig ?? {
    version: TOADSTOOL_HOOK_VERSION,
    hooks: {},
  };
  const mergedHooks: Record<string, CursorHookCommandEntry[]> = {};

  for (const [eventName, entries] of Object.entries(base.hooks)) {
    mergedHooks[eventName] = [...entries];
  }

  for (const [eventName, generatedEntries] of Object.entries(generatedConfig.hooks)) {
    const existingEntries = mergedHooks[eventName] ?? [];
    const nextEntries = [...existingEntries];
    for (const generatedEntry of generatedEntries) {
      const alreadyPresent = existingEntries.some(
        (entry) =>
          entry.command === generatedEntry.command && entry.timeout === generatedEntry.timeout
      );
      if (!alreadyPresent) {
        nextEntries.push(generatedEntry);
      }
    }
    mergedHooks[eventName] = nextEntries;
  }

  return {
    version: base.version || TOADSTOOL_HOOK_VERSION,
    hooks: mergedHooks,
  };
};

export const injectHookSocketEnv = (
  env: NodeJS.ProcessEnv,
  socketTarget: string
): NodeJS.ProcessEnv => ({
  ...env,
  [ENV_KEY.TOADSTOOL_HOOK_SOCKET]: socketTarget,
});

const ensureExecutable = async (filePath: string): Promise<void> => {
  try {
    await chmod(filePath, EXECUTABLE_MODE);
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return;
    }
    throw error;
  }
};

const resolveHookCommand = (
  nodeShimPath: string,
  useBashShim: boolean,
  bashShimPath: string
): string => {
  if (useBashShim) {
    return bashShimPath;
  }
  if (process.platform === "win32") {
    return `node "${nodeShimPath}"`;
  }
  return nodeShimPath;
};

export const installCursorHooks = async (
  options: InstallCursorHooksOptions
): Promise<CursorHookInstallation> => {
  const scope = options.scope ?? CURSOR_HOOK_INSTALL_SCOPE.PROJECT;
  const paths = resolveCursorHookInstallPaths(scope, {
    cwd: options.cwd,
    homeDir: options.homeDir,
  });

  await mkdir(paths.toadstoolHooksDir, { recursive: true });
  await mkdir(path.dirname(paths.hooksFilePath), { recursive: true });

  await writeFile(paths.nodeShimPath, createNodeShimScript(), ENCODING.UTF8);
  await writeFile(paths.bashShimPath, createBashShimScript(), ENCODING.UTF8);
  await ensureExecutable(paths.nodeShimPath);
  await ensureExecutable(paths.bashShimPath);

  const previousHooksRaw = await readFileIfExists(paths.hooksFilePath);
  const existingConfig = parseHooksFile(previousHooksRaw);
  const hookCommand = resolveHookCommand(
    paths.nodeShimPath,
    options.useBashShim ?? false,
    paths.bashShimPath
  );
  const generatedConfig = generateCursorHooksConfig({
    command: hookCommand,
    enabledEvents: options.enabledEvents,
  });
  const mergedConfig = mergeCursorHooksConfig(existingConfig, generatedConfig);

  await writeFile(paths.hooksFilePath, formatJson(mergedConfig), ENCODING.UTF8);

  return {
    paths,
    previousHooksRaw,
    generatedCommand: hookCommand,
    generatedConfig,
  };
};

export const cleanupCursorHooks = async (installation: CursorHookInstallation): Promise<void> => {
  if (installation.previousHooksRaw !== null) {
    await writeFile(installation.paths.hooksFilePath, installation.previousHooksRaw, ENCODING.UTF8);
  } else {
    await removeFileIfExists(installation.paths.hooksFilePath);
  }

  await removeFileIfExists(installation.paths.nodeShimPath);
  await removeFileIfExists(installation.paths.bashShimPath);

  try {
    const hookDirStat = await stat(installation.paths.toadstoolHooksDir);
    if (hookDirStat.isDirectory()) {
      await rm(installation.paths.toadstoolHooksDir, { recursive: true, force: true });
    }
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return;
    }
    throw error;
  }
};
