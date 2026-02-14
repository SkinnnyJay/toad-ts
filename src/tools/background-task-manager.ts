import { LIMIT } from "@/config/limits";
import { BACKGROUND_TASK_STATUS } from "@/constants/background-task-status";
import { ENV_KEY } from "@/constants/env-keys";
import { PLATFORM } from "@/constants/platform";
import { type BackgroundTask, type BackgroundTaskId, BackgroundTaskIdSchema } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { buildWindowsCmdExecArgs } from "@/utils/windows-command.utils";
import { nanoid } from "nanoid";

import { useBackgroundTaskStore } from "@/store/background-task-store";
import type { TerminalManager, TerminalSessionOutput } from "@/tools/terminal-manager";

export interface BackgroundTaskCommand {
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  outputByteLimit?: number;
}

export interface BackgroundTaskOutput {
  task: BackgroundTask;
  output: TerminalSessionOutput;
}

interface ShellCommandSpec {
  command: string;
  args: string[];
}

const SHELL_COMMAND = {
  POSIX: "bash",
  WINDOWS: "cmd.exe",
} as const;

const SHELL_ARGS = {
  POSIX: ["-lc"],
} as const;

const resolveShellCommand = (command: string): ShellCommandSpec => {
  if (process.platform === PLATFORM.WIN32) {
    return { command: SHELL_COMMAND.WINDOWS, args: buildWindowsCmdExecArgs(command) };
  }
  const envShell = EnvManager.getInstance().getSnapshot()[ENV_KEY.SHELL];
  const shellCommand = envShell ?? SHELL_COMMAND.POSIX;
  return { command: shellCommand, args: [...SHELL_ARGS.POSIX, command] };
};

export class BackgroundTaskManager {
  private readonly terminalManager: TerminalManager;
  private readonly now: () => number;
  private readonly completions = new Map<BackgroundTaskId, Promise<TerminalSessionOutput>>();

  constructor(terminalManager: TerminalManager, options: { now?: () => number } = {}) {
    this.terminalManager = terminalManager;
    this.now = options.now ?? (() => Date.now());
  }

  startTask(input: BackgroundTaskCommand): BackgroundTask {
    const taskId = BackgroundTaskIdSchema.parse(nanoid(LIMIT.NANOID_LENGTH));
    const shellSpec = resolveShellCommand(input.command);
    const terminalId = this.terminalManager.createSession({
      command: shellSpec.command,
      args: shellSpec.args,
      cwd: input.cwd,
      env: input.env,
      outputByteLimit: input.outputByteLimit,
    });
    const timestamp = this.now();
    const task: BackgroundTask = {
      id: taskId,
      command: input.command,
      status: BACKGROUND_TASK_STATUS.RUNNING,
      terminalId,
      createdAt: timestamp,
      startedAt: timestamp,
      completedAt: undefined,
    };

    useBackgroundTaskStore.getState().addTask(task);
    const completion = this.terminalManager
      .waitForExit(terminalId)
      .then((output) => {
        const status =
          output.exitCode === 0 ? BACKGROUND_TASK_STATUS.COMPLETED : BACKGROUND_TASK_STATUS.FAILED;
        useBackgroundTaskStore.getState().updateTask(taskId, {
          status,
          completedAt: this.now(),
        });
        return output;
      })
      .catch((error) => {
        useBackgroundTaskStore.getState().updateTask(taskId, {
          status: BACKGROUND_TASK_STATUS.FAILED,
          completedAt: this.now(),
        });
        throw error;
      })
      .finally(() => {
        this.completions.delete(taskId);
      });

    this.completions.set(taskId, completion);
    return task;
  }

  getTask(taskId: BackgroundTaskId): BackgroundTask | undefined {
    return useBackgroundTaskStore.getState().getTask(taskId);
  }

  listTasks(): BackgroundTask[] {
    return useBackgroundTaskStore.getState().listTasks();
  }

  getOutput(taskId: BackgroundTaskId): BackgroundTaskOutput {
    const task = useBackgroundTaskStore.getState().getTask(taskId);
    if (!task) {
      throw new Error(`Background task not found: ${taskId}`);
    }
    const output = this.terminalManager.getOutput(task.terminalId);
    return { task, output };
  }

  async waitForTask(taskId: BackgroundTaskId): Promise<BackgroundTaskOutput> {
    const task = useBackgroundTaskStore.getState().getTask(taskId);
    if (!task) {
      throw new Error(`Background task not found: ${taskId}`);
    }
    const pending = this.completions.get(taskId);
    if (pending) {
      await pending;
    }
    return this.getOutput(taskId);
  }

  cancelTask(taskId: BackgroundTaskId): void {
    const task = useBackgroundTaskStore.getState().getTask(taskId);
    if (!task) {
      throw new Error(`Background task not found: ${taskId}`);
    }
    this.terminalManager.kill(task.terminalId);
    useBackgroundTaskStore.getState().updateTask(taskId, {
      status: BACKGROUND_TASK_STATUS.CANCELLED,
      completedAt: this.now(),
    });
  }
}
