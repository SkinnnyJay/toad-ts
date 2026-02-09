import { FsHandler } from "@/core/fs-handler";
import { SearchService } from "@/core/search/search-service";
import { TerminalHandler } from "@/core/terminal-handler";
import { BackgroundTaskManager } from "@/tools/background-task-manager";
import { createBuiltInTools } from "@/tools/builtin";
import { ToolRegistry } from "@/tools/registry";
import { ShellSessionManager } from "@/tools/shell-session";
import { TerminalManager } from "@/tools/terminal-manager";
import { TodoStore } from "@/tools/todo-store";
import type { Fetcher, ToolContext } from "@/tools/types";
import { EnvManager } from "@/utils/env/env.utils";

export interface ToolRuntimeOptions {
  baseDir?: string;
  sessionId?: string;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  fetcher?: Fetcher;
}

export interface ToolRuntime {
  registry: ToolRegistry;
  context: ToolContext;
}

export const createToolRuntime = (options: ToolRuntimeOptions = {}): ToolRuntime => {
  const baseDir = options.baseDir ?? process.cwd();
  const env = options.env ?? EnvManager.getInstance().getSnapshot();
  const now = options.now ?? (() => Date.now());
  const fs = new FsHandler({ baseDir, env });
  const search = new SearchService({ baseDir, env });
  const terminal = new TerminalHandler({ defaultCwd: baseDir, env });
  const shell = new ShellSessionManager({ baseDir, env });
  const terminalManager = new TerminalManager({ baseDir, env });
  const backgroundTasks = new BackgroundTaskManager(terminalManager, { now });
  const todoStore = new TodoStore(fs, baseDir);
  const fetcher: Fetcher =
    options.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

  const registry = new ToolRegistry();
  registry.registerAll(createBuiltInTools());

  const context: ToolContext = {
    fs,
    search,
    terminal,
    shell,
    backgroundTasks,
    todoStore,
    fetcher,
    baseDir,
    sessionId: options.sessionId,
    now,
  };

  return { registry, context };
};
