import { chmod, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { INDENT_SPACES } from "@/constants/json-format";
import type { HookIpcEndpoint } from "@/core/cursor/hook-ipc-server";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { z } from "zod";

const CURSOR_HOOKS_VERSION = 1;
const TOADSTOOL_SHIM_FILENAME = "toadstool-cursor-hook-shim.mjs";
const TOADSTOOL_HOOKS_MARKER = "# toadstool-cursor-hook";
const CURSOR_DIR_NAME = ".cursor";
const CURSOR_HOOKS_FILE = "hooks.json";

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

const buildShimContent = (): string => {
  return `#!/usr/bin/env node
import http from "node:http";

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk.toString());
}

const payload = chunks.join("");
const endpoint = process.env.TOADSTOOL_HOOK_SOCKET;
if (!endpoint || payload.length === 0) {
  process.stdout.write("{}");
  process.exit(0);
}

const postHttp = async () => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

const parseExistingHooks = async (hooksPath: string): Promise<CursorHooksFile | null> => {
  try {
    const contents = await readFile(hooksPath, ENCODING.UTF8);
    const parsed: unknown = JSON.parse(contents);
    return CursorHooksFileSchema.parse(parsed);
  } catch (_error) {
    return null;
  }
};

const getShimCommand = (shimPath: string): string => {
  return `node "${shimPath}" ${TOADSTOOL_HOOKS_MARKER}`;
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
  restore: () => Promise<void>;
}

export interface HooksConfigGeneratorOptions {
  projectRoot?: string;
}

export class HooksConfigGenerator {
  private readonly logger = createClassLogger("HooksConfigGenerator");
  private readonly projectRoot: string;

  public constructor(options: HooksConfigGeneratorOptions = {}) {
    this.projectRoot = options.projectRoot ?? process.cwd();
  }

  public resolveInstallPaths(): { cursorDir: string; hooksPath: string; shimPath: string } {
    const cursorDir = path.join(this.projectRoot, CURSOR_DIR_NAME);
    return {
      cursorDir,
      hooksPath: path.join(cursorDir, CURSOR_HOOKS_FILE),
      shimPath: path.join(cursorDir, TOADSTOOL_SHIM_FILENAME),
    };
  }

  public createHookEnv(endpoint: HookIpcEndpoint): Record<string, string> {
    return {
      [ENV_KEY.TOADSTOOL_HOOK_SOCKET]: endpoint.socketPath ?? endpoint.url ?? "",
    };
  }

  public async install(_endpoint: HookIpcEndpoint): Promise<HooksInstallResult> {
    const paths = this.resolveInstallPaths();
    await mkdir(paths.cursorDir, { recursive: true });

    const existingHooksRaw = await readFile(paths.hooksPath, ENCODING.UTF8).catch(() => null);
    const existingHooks = await parseExistingHooks(paths.hooksPath);

    const shimContent = buildShimContent();
    await writeFile(paths.shimPath, shimContent, ENCODING.UTF8);
    await chmod(paths.shimPath, 0o755);

    const shimCommand = getShimCommand(paths.shimPath);
    const mergedHooks = mergeHooks(existingHooks, shimCommand);
    await writeFile(
      paths.hooksPath,
      JSON.stringify(mergedHooks, null, INDENT_SPACES),
      ENCODING.UTF8
    );

    this.logger.info("Installed Cursor hook shim", {
      hooksPath: paths.hooksPath,
      shimPath: paths.shimPath,
    });

    return {
      hooksPath: paths.hooksPath,
      shimPath: paths.shimPath,
      restore: async () => {
        if (existingHooksRaw === null) {
          await rm(paths.hooksPath, { force: true });
        } else {
          await writeFile(paths.hooksPath, existingHooksRaw, ENCODING.UTF8);
        }
        const shimExists = await stat(paths.shimPath).catch(() => null);
        if (shimExists) {
          await rm(paths.shimPath, { force: true });
        }
      },
    };
  }
}
