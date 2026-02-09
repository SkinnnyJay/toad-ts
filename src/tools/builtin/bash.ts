import { z } from "zod";

import type { BackgroundTaskStatus } from "@/constants/background-task-status";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ShellCommandResult } from "@/tools/shell-session";
import type { ToolDefinition } from "@/tools/types";
import type { BackgroundTaskId } from "@/types/domain";

const BashInputSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  background: z.boolean().optional(),
});

export type BashToolInput = z.infer<typeof BashInputSchema>;

export interface BashBackgroundOutput {
  taskId: BackgroundTaskId;
  status: BackgroundTaskStatus;
  background: true;
}

export type BashToolOutput = ShellCommandResult | BashBackgroundOutput;

export const bashTool: ToolDefinition<BashToolOutput> = {
  name: TOOL_NAME.BASH,
  description: "Execute a shell command in a persistent session.",
  kind: TOOL_KIND.EXECUTE,
  inputSchema: BashInputSchema,
  execute: async (input, context) => {
    const parsed = BashInputSchema.parse(input);
    if (parsed.background) {
      const task = context.backgroundTasks.startTask({
        command: parsed.command,
        cwd: parsed.cwd,
      });
      return {
        ok: true,
        output: {
          taskId: task.id,
          status: task.status,
          background: true,
        },
      };
    }

    const result = await context.shell.execute(parsed.command, {
      cwd: parsed.cwd,
      timeoutMs: parsed.timeoutMs,
    });

    return { ok: true, output: result };
  },
};
