import { LIMIT } from "@/config/limits";
import { HOOK_EVENT } from "@/constants/hook-events";
import { TOOL_NAME } from "@/constants/tool-names";
import { getHookManager } from "@/hooks/hook-service";
import { getCheckpointManager } from "@/store/checkpoints/checkpoint-service";
import type { ClientCapabilities } from "@agentclientprotocol/sdk";
import type {
  CreateTerminalRequest,
  CreateTerminalResponse,
  KillTerminalCommandRequest,
  KillTerminalCommandResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  ReleaseTerminalRequest,
  ReleaseTerminalResponse,
  TerminalOutputRequest,
  TerminalOutputResponse,
  WaitForTerminalExitRequest,
  WaitForTerminalExitResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
} from "@agentclientprotocol/sdk";

import { FsHandler } from "@/core/fs-handler";
import { TerminalManager } from "@/tools/terminal-manager";

export interface ToolHostOptions {
  baseDir?: string;
  env?: NodeJS.ProcessEnv;
  allowEscape?: boolean;
}

const resolveEnv = (vars?: Array<{ name: string; value: string }>): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {};
  vars?.forEach((entry) => {
    env[entry.name] = entry.value;
  });
  return env;
};

const sliceLines = (content: string, startLine: number, limit?: number): string => {
  const lines = content.split(/\r?\n/);
  const startIndex = Math.max(1, startLine) - 1;
  const maxLines = limit ?? Math.max(0, lines.length - startIndex);
  return lines.slice(startIndex, startIndex + maxLines).join("\n");
};

export class ToolHost {
  readonly capabilities: ClientCapabilities;
  private readonly fs: FsHandler;
  private readonly terminalManager: TerminalManager;

  constructor(options: ToolHostOptions = {}) {
    this.fs = new FsHandler({
      baseDir: options.baseDir,
      env: options.env,
      allowEscape: options.allowEscape,
    });
    this.terminalManager = new TerminalManager({
      baseDir: options.baseDir,
      env: options.env,
      allowEscape: options.allowEscape,
    });
    this.capabilities = {
      fs: {
        readTextFile: true,
        writeTextFile: true,
      },
      terminal: true,
    };
  }

  async readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse> {
    return this.runWithHooks(TOOL_NAME.READ, params, async () => {
      const content = await this.fs.read(params.path);
      const startLine = params.line ?? 1;
      const sliced = sliceLines(content, startLine, params.limit ?? undefined);
      return { content: sliced };
    });
  }

  async writeTextFile(params: WriteTextFileRequest): Promise<WriteTextFileResponse> {
    return this.runWithHooks(TOOL_NAME.WRITE, params, async () => {
      const checkpointManager = getCheckpointManager();
      const absolutePath = this.fs.resolve(params.path);
      const existed = await this.fs.exists(params.path);
      const before = existed ? await this.fs.read(params.path) : null;
      await this.fs.write(params.path, params.content);
      checkpointManager?.recordFileChange({
        path: absolutePath,
        before,
        after: params.content,
      });
      return {};
    });
  }

  async createTerminal(params: CreateTerminalRequest): Promise<CreateTerminalResponse> {
    return this.runWithHooks(TOOL_NAME.BASH, params, async () => {
      const terminalId = this.terminalManager.createSession({
        command: params.command,
        args: params.args,
        cwd: params.cwd ?? undefined,
        env: resolveEnv(params.env),
        outputByteLimit: params.outputByteLimit ?? LIMIT.TERMINAL_OUTPUT_MAX_BYTES,
      });
      return { terminalId };
    });
  }

  async terminalOutput(params: TerminalOutputRequest): Promise<TerminalOutputResponse> {
    const snapshot = this.terminalManager.getOutput(params.terminalId);
    return {
      output: snapshot.output,
      truncated: snapshot.truncated,
      exitStatus:
        snapshot.exitCode !== null || snapshot.signal !== null
          ? {
              exitCode: snapshot.exitCode,
              signal: snapshot.signal ?? undefined,
            }
          : null,
    };
  }

  async waitForTerminalExit(
    params: WaitForTerminalExitRequest
  ): Promise<WaitForTerminalExitResponse> {
    const snapshot = await this.terminalManager.waitForExit(params.terminalId);
    return {
      exitCode: snapshot.exitCode ?? undefined,
      signal: snapshot.signal ?? undefined,
    };
  }

  async killTerminal(params: KillTerminalCommandRequest): Promise<KillTerminalCommandResponse> {
    this.terminalManager.kill(params.terminalId);
    return {};
  }

  async releaseTerminal(params: ReleaseTerminalRequest): Promise<ReleaseTerminalResponse> {
    this.terminalManager.release(params.terminalId);
    return {};
  }

  private async runWithHooks<T>(
    toolName: string,
    input: Record<string, unknown>,
    action: () => Promise<T>
  ): Promise<T> {
    const hookManager = getHookManager();
    if (hookManager) {
      const decision = await hookManager.runHooks(
        HOOK_EVENT.PRE_TOOL_USE,
        {
          matcherTarget: toolName,
          payload: {
            toolName,
            input,
          },
        },
        { canBlock: true }
      );
      if (!decision.allow) {
        throw new Error(decision.message ?? "Tool blocked by hook.");
      }
    }
    try {
      const result = await action();
      if (hookManager) {
        void hookManager.runHooks(HOOK_EVENT.POST_TOOL_USE, {
          matcherTarget: toolName,
          payload: {
            toolName,
            input,
            result,
          },
        });
      }
      return result;
    } catch (error) {
      if (hookManager) {
        void hookManager.runHooks(HOOK_EVENT.POST_TOOL_USE, {
          matcherTarget: toolName,
          payload: {
            toolName,
            input,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      throw error;
    }
  }
}
