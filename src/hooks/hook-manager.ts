import { spawn } from "node:child_process";
import path from "node:path";
import type { HookDefinition, HookGroup, HooksConfig } from "@/config/app-config";
import type { HookEvent } from "@/constants/hook-events";
import { HOOK_TYPE } from "@/constants/hook-types";
import type { SessionId } from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";

export interface HookContext {
  event: HookEvent;
  matcherTarget?: string;
  sessionId?: SessionId;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface HookDecision {
  allow: boolean;
  message?: string;
}

export type PromptHookRunner = (prompt: string, context: HookContext) => Promise<HookDecision>;

export type CommandHookRunner = (command: string, context: HookContext) => Promise<HookDecision>;

export interface HookManagerOptions {
  hooks: HooksConfig;
  baseDir?: string;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  promptRunner?: PromptHookRunner;
  commandRunner?: CommandHookRunner;
}

export interface HookRunOptions {
  canBlock?: boolean;
}

const DEFAULT_HOOK_BLOCK_MESSAGE = "Hook blocked the action.";

const matchGroup = (group: HookGroup, context: HookContext): boolean => {
  if (!group.matcher) {
    return true;
  }
  if (!context.matcherTarget) {
    return false;
  }
  try {
    const regex = new RegExp(group.matcher);
    return regex.test(context.matcherTarget);
  } catch (_error) {
    return false;
  }
};

const resolveCommand = (command: string, baseDir: string): string => {
  const looksLikePath =
    command.startsWith(".") ||
    command.startsWith("/") ||
    command.includes(path.sep) ||
    command.includes("/");
  if (!looksLikePath) {
    return command;
  }
  if (path.isAbsolute(command)) {
    return command;
  }
  return path.join(baseDir, command);
};

const runCommand = async (
  command: string,
  context: HookContext,
  baseDir: string,
  env: NodeJS.ProcessEnv
): Promise<HookDecision> => {
  const resolved = resolveCommand(command, baseDir);
  return new Promise<HookDecision>((resolve) => {
    const child = spawn(resolved, {
      shell: true,
      cwd: baseDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout.push(chunk.toString());
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr.push(chunk.toString());
    });

    child.on("error", (error) => {
      resolve({
        allow: false,
        message: error instanceof Error ? error.message : String(error),
      });
    });

    child.on("close", (code) => {
      const output = stdout.join("").trim();
      const errorOutput = stderr.join("").trim();
      resolve({
        allow: code === 0,
        message: errorOutput || output || DEFAULT_HOOK_BLOCK_MESSAGE,
      });
    });

    if (child.stdin) {
      child.stdin.write(JSON.stringify(context));
      child.stdin.end();
    }
  });
};

export class HookManager {
  private hooks: HooksConfig;
  private readonly baseDir: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly now: () => number;
  private readonly promptRunner?: PromptHookRunner;
  private readonly commandRunner: CommandHookRunner;
  private readonly logger = createClassLogger("HookManager");

  constructor(options: HookManagerOptions) {
    this.hooks = options.hooks;
    this.baseDir = options.baseDir ?? process.cwd();
    this.env = options.env ?? process.env;
    this.now = options.now ?? (() => Date.now());
    this.promptRunner = options.promptRunner;
    this.commandRunner =
      options.commandRunner ??
      ((command, context) => runCommand(command, context, this.baseDir, this.env));
  }

  updateConfig(config: HooksConfig): void {
    this.hooks = config;
  }

  async runHooks(
    event: HookEvent,
    context: Omit<HookContext, "event" | "timestamp">,
    options: HookRunOptions = {}
  ): Promise<HookDecision> {
    const groups = this.hooks[event] ?? [];
    if (groups.length === 0) {
      return { allow: true };
    }

    const hookContext: HookContext = {
      event,
      timestamp: this.now(),
      matcherTarget: context.matcherTarget,
      sessionId: context.sessionId,
      payload: context.payload,
    };

    for (const group of groups) {
      if (!matchGroup(group, hookContext)) {
        continue;
      }
      const decision = await this.runGroup(group, hookContext, options.canBlock ?? false);
      if (!decision.allow && options.canBlock) {
        return decision;
      }
    }

    return { allow: true };
  }

  private async runGroup(
    group: HookGroup,
    context: HookContext,
    canBlock: boolean
  ): Promise<HookDecision> {
    for (const hook of group.hooks) {
      const decision = await this.runHook(hook, context);
      if (!decision.allow && canBlock) {
        return decision;
      }
    }
    return { allow: true };
  }

  private async runHook(hook: HookDefinition, context: HookContext): Promise<HookDecision> {
    try {
      if (hook.type === HOOK_TYPE.COMMAND && hook.command) {
        return await this.commandRunner(hook.command, context);
      }
      if (hook.type === HOOK_TYPE.PROMPT && hook.prompt) {
        if (!this.promptRunner) {
          return { allow: true };
        }
        return await this.promptRunner(hook.prompt, context);
      }
      return { allow: true };
    } catch (error) {
      this.logger.warn("Hook failed", {
        event: context.event,
        error: error instanceof Error ? error.message : String(error),
      });
      return { allow: true };
    }
  }
}
