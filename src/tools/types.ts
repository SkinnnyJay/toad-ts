import type { z } from "zod";

import type { ToolKind } from "@/constants/tool-kinds";
import type { ToolName } from "@/constants/tool-names";
import type { FsHandler } from "@/core/fs-handler";
import type { SearchService } from "@/core/search/search-service";
import type { TerminalHandler } from "@/core/terminal-handler";
import type { BackgroundTaskManager } from "@/tools/background-task-manager";
import type { ShellSessionManager } from "@/tools/shell-session";
import type { TodoStore } from "@/tools/todo-store";

export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ToolContext {
  readonly fs: FsHandler;
  readonly search: SearchService;
  readonly terminal: TerminalHandler;
  readonly shell: ShellSessionManager;
  readonly backgroundTasks: BackgroundTaskManager;
  readonly todoStore: TodoStore;
  readonly fetcher: Fetcher;
  readonly baseDir: string;
  readonly sessionId?: string;
  readonly now: () => number;
}

export interface ToolSuccess<Output> {
  ok: true;
  output: Output;
  metadata?: Record<string, unknown>;
}

export interface ToolFailure {
  ok: false;
  error: string;
  metadata?: Record<string, unknown>;
}

export type ToolResult<Output> = ToolSuccess<Output> | ToolFailure;

export interface ToolDefinition<Output> {
  name: ToolName;
  description: string;
  kind: ToolKind;
  inputSchema: z.ZodTypeAny;
  execute: (input: unknown, context: ToolContext) => Promise<ToolResult<Output>>;
}
