import { chmod, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { HOOK_IPC_AUTH } from "@/constants/hook-ipc-auth";
import { INDENT_SPACES } from "@/constants/json-format";
import type { HookIpcEndpoint } from "@/core/cursor/hook-ipc-server";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { z } from "zod";

const CURSOR_HOOKS_VERSION = 1;
const TOADSTOOL_NODE_SHIM_FILENAME = "toadstool-cursor-hook-shim.mjs";
const TOADSTOOL_BASH_SHIM_FILENAME = "toadstool-cursor-hook-shim.sh";
const TOADSTOOL_HOOKS_MARKER = "# toadstool-cursor-hook";
const CURSOR_DIR_NAME = ".cursor";
const CURSOR_HOOKS_FILE = "hooks.json";
const SHIM_FILE_MODE = 0o755;

const HOOKS_INSTALL_SCOPE = {
  PROJECT: "project",
  USER: "user",
} as const;

type HooksInstallScope = (typeof HOOKS_INSTALL_SCOPE)[keyof typeof HOOKS_INSTALL_SCOPE];

const CursorHooksFileSchema = z
  .object({
    version: z.number().int().positive(),
    hooks: z.record(z.array(z.string())).default({}),
  })
  .strict();

type CursorHooksFile = z.infer<typeof CursorHooksFileSchema>;

const CURSOR_HOOK_EVENTS_TO_INSTALL = [
  CURSOR_HOOK_EVENT.SESSION_START,
  CURSOR_HOOK_EVENT.SESSION_END,
  CURSOR_HOOK_EVENT.PRE_TOOL_USE,
  CURSOR_HOOK_EVENT.POST_TOOL_USE,
  CURSOR_HOOK_EVENT.POST_TOOL_USE_FAILURE,
  CURSOR_HOOK_EVENT.SUBAGENT_START,
  CURSOR_HOOK_EVENT.SUBAGENT_STOP,
  CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION,
  CURSOR_HOOK_EVENT.AFTER_SHELL_EXECUTION,
  CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION,
  CURSOR_HOOK_EVENT.AFTER_MCP_EXECUTION,
  CURSOR_HOOK_EVENT.BEFORE_READ_FILE,
  CURSOR_HOOK_EVENT.AFTER_FILE_EDIT,
  CURSOR_HOOK_EVENT.BEFORE_SUBMIT_PROMPT,
  CURSOR_HOOK_EVENT.PRE_COMPACT,
  CURSOR_HOOK_EVENT.STOP,
  CURSOR_HOOK_EVENT.AFTER_AGENT_RESPONSE,
  CURSOR_HOOK_EVENT.AFTER_AGENT_THOUGHT,
] as const;

const buildNodeShimContent = (): string => {
  return `#!/usr/bin/env node
import http from "node:http";

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk.toString());
}

const payload = chunks.join("");
const endpoint = process.env.${ENV_KEY.TOADSTOOL_HOOK_SOCKET};
const hookToken = process.env.${ENV_KEY.TOADSTOOL_HOOK_TOKEN};
const hookNonce = process.env.${ENV_KEY.TOADSTOOL_HOOK_NONCE};
if (!endpoint || payload.length === 0) {
  process.stdout.write("{}");
  process.exit(0);
}

const postHttp = async () => {
  const headers = { "Content-Type": "application/json" };
  if (hookToken) {
    headers["${HOOK_IPC_AUTH.TOKEN_HEADER}"] = hookToken;
  }
  if (hookNonce) {
    headers["${HOOK_IPC_AUTH.NONCE_HEADER}"] = hookNonce;
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: payload,
  });
  const text = await response.text();
  process.stdout.write(text || "{}");
};

const postSocket = () =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: "POST",
        socketPath: endpoint,
        path: "/",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        const responseChunks = [];
        res.on("data", (chunk) => responseChunks.push(chunk.toString()));
        res.on("end", () => {
          process.stdout.write(responseChunks.join("") || "{}");
          resolve(undefined);
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

try {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    await postHttp();
  } else {
    await postSocket();
  }
} catch (_error) {
  process.stdout.write("{}");
}
`;
};

const buildBashShimContent = (nodeShimPath: string): string => {
  return `#!/usr/bin/env bash
payload="$(cat)"
endpoint="\${${ENV_KEY.TOADSTOOL_HOOK_SOCKET}:-}"
hook_token="\${${ENV_KEY.TOADSTOOL_HOOK_TOKEN}:-}"
hook_nonce="\${${ENV_KEY.TOADSTOOL_HOOK_NONCE}:-}"

if [ -z "$endpoint" ] || [ -z "$payload" ]; then
  printf '{}'
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  node_response="$(printf '%s' "$payload" | node "${nodeShimPath}" 2>/dev/null || true)"
  if [ -n "$node_response" ]; then
    printf '%s' "$node_response"
    exit 0
  fi
fi

if ! command -v curl >/dev/null 2>&1; then
  printf '{}'
  exit 0
fi

if [[ "$endpoint" == http://* || "$endpoint" == https://* ]]; then
  auth_headers=()
  if [ -n "$hook_token" ]; then
    auth_headers+=(-H "${HOOK_IPC_AUTH.TOKEN_HEADER}: $hook_token")
  fi
  if [ -n "$hook_nonce" ]; then
    auth_headers+=(-H "${HOOK_IPC_AUTH.NONCE_HEADER}: $hook_nonce")
  fi
  response="$(curl -sS -X POST -H "Content-Type: application/json" "\${auth_headers[@]}" --data "$payload" "$endpoint" 2>/dev/null || true)"
else
  response="$(curl -sS --unix-socket "$endpoint" -X POST -H "Content-Type: application/json" --data "$payload" "http://localhost/" 2>/dev/null || true)"
fi

if [ -z "$response" ]; then
  printf '{}'
else
  printf '%s' "$response"
fi
`;
};

const parseExistingHooks = (contents: string | null): CursorHooksFile | null => {
  if (contents === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(contents);
    return CursorHooksFileSchema.parse(parsed);
  } catch (_error) {
    return null;
  }
};

const getShimCommand = (bashShimPath: string): string => {
  return `bash "${bashShimPath}" ${TOADSTOOL_HOOKS_MARKER}`;
};

const mergeHooks = (existing: CursorHooksFile | null, shimCommand: string): CursorHooksFile => {
  const mergedHooks: Record<string, string[]> = { ...(existing?.hooks ?? {}) };
  for (const eventName of CURSOR_HOOK_EVENTS_TO_INSTALL) {
    const existingCommands = mergedHooks[eventName] ?? [];
    const nextCommands = existingCommands.filter(
      (command) => !command.includes(TOADSTOOL_HOOKS_MARKER)
    );
    nextCommands.push(shimCommand);
    mergedHooks[eventName] = nextCommands;
  }
  return {
    version: existing?.version ?? CURSOR_HOOKS_VERSION,
    hooks: mergedHooks,
  };
};

export interface HooksInstallResult {
  hooksPath: string;
  shimPath: string;
  nodeShimPath: string;
  bashShimPath: string;
  restore: () => Promise<void>;
}

export interface HooksConfigGeneratorOptions {
  projectRoot?: string;
  userHomeDir?: string;
  installScope?: HooksInstallScope;
}

export class HooksConfigGenerator {
  private readonly logger = createClassLogger("HooksConfigGenerator");
  private readonly projectRoot: string;
  private readonly userHomeDir: string;
  private readonly installScope: HooksInstallScope;

  public constructor(options: HooksConfigGeneratorOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();
    this.userHomeDir = options.userHomeDir ?? homedir();
    this.installScope = options.installScope ?? HOOKS_INSTALL_SCOPE.PROJECT;
  }

  public resolveInstallPaths(): {
    cursorDir: string;
    hooksPath: string;
    shimPath: string;
    nodeShimPath: string;
    bashShimPath: string;
  } {
    const baseDir =
      this.installScope === HOOKS_INSTALL_SCOPE.USER ? this.userHomeDir : this.projectRoot;
    const cursorDir = path.join(baseDir, CURSOR_DIR_NAME);
    const nodeShimPath = path.join(cursorDir, TOADSTOOL_NODE_SHIM_FILENAME);
    const bashShimPath = path.join(cursorDir, TOADSTOOL_BASH_SHIM_FILENAME);
    return {
      cursorDir,
      hooksPath: path.join(cursorDir, CURSOR_HOOKS_FILE),
      shimPath: nodeShimPath,
      nodeShimPath,
      bashShimPath,
    };
  }

  public createHookEnv(endpoint: HookIpcEndpoint): Record<string, string> {
    const env: Record<string, string> = {
      [ENV_KEY.TOADSTOOL_HOOK_SOCKET]: endpoint.socketPath ?? endpoint.url ?? "",
    };
    if (endpoint.authToken && endpoint.authNonce) {
      env[ENV_KEY.TOADSTOOL_HOOK_TOKEN] = endpoint.authToken;
      env[ENV_KEY.TOADSTOOL_HOOK_NONCE] = endpoint.authNonce;
    }
    return env;
  }

  public async install(_endpoint: HookIpcEndpoint): Promise<HooksInstallResult> {
    const paths = this.resolveInstallPaths();
    await mkdir(paths.cursorDir, { recursive: true });

    const existingHooksRaw = await readFile(paths.hooksPath, ENCODING.UTF8).catch(() => null);
    const existingHooks = parseExistingHooks(existingHooksRaw);

    const nodeShimContent = buildNodeShimContent();
    await writeFile(paths.nodeShimPath, nodeShimContent, ENCODING.UTF8);
    await chmod(paths.nodeShimPath, SHIM_FILE_MODE);

    const bashShimContent = buildBashShimContent(paths.nodeShimPath);
    await writeFile(paths.bashShimPath, bashShimContent, ENCODING.UTF8);
    await chmod(paths.bashShimPath, SHIM_FILE_MODE);

    const shimCommand = getShimCommand(paths.bashShimPath);
    const mergedHooks = mergeHooks(existingHooks, shimCommand);
    await writeFile(
      paths.hooksPath,
      JSON.stringify(mergedHooks, null, INDENT_SPACES),
      ENCODING.UTF8
    );

    this.logger.info("Installed Cursor hook shim", {
      hooksPath: paths.hooksPath,
      shimPath: paths.nodeShimPath,
      bashShimPath: paths.bashShimPath,
      scope: this.installScope,
    });

    return {
      hooksPath: paths.hooksPath,
      shimPath: paths.nodeShimPath,
      nodeShimPath: paths.nodeShimPath,
      bashShimPath: paths.bashShimPath,
      restore: async () => {
        if (existingHooksRaw === null) {
          await rm(paths.hooksPath, { force: true });
        } else {
          await writeFile(paths.hooksPath, existingHooksRaw, ENCODING.UTF8);
        }
        const nodeShimExists = await stat(paths.nodeShimPath).catch(() => null);
        if (nodeShimExists) {
          await rm(paths.nodeShimPath, { force: true });
        }
        const bashShimExists = await stat(paths.bashShimPath).catch(() => null);
        if (bashShimExists) {
          await rm(paths.bashShimPath, { force: true });
        }
      },
    };
  }
}
