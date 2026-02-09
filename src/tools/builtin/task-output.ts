import { z } from "zod";

import type { BackgroundTaskStatus } from "@/constants/background-task-status";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ToolDefinition } from "@/tools/types";
import { type BackgroundTaskId, BackgroundTaskIdSchema } from "@/types/domain";

const TaskOutputInputSchema = z.object({
  taskId: BackgroundTaskIdSchema,
});

export type TaskOutputToolInput = z.infer<typeof TaskOutputInputSchema>;

export interface TaskOutputToolResult {
  taskId: BackgroundTaskId;
  status: BackgroundTaskStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  truncated: boolean;
}

export const taskOutputTool: ToolDefinition<TaskOutputToolResult> = {
  name: TOOL_NAME.TASK_OUTPUT,
  description: "Fetch output for a background task.",
  kind: TOOL_KIND.READ,
  inputSchema: TaskOutputInputSchema,
  execute: async (input, context) => {
    const parsed = TaskOutputInputSchema.parse(input);
    const { task, output } = context.backgroundTasks.getOutput(parsed.taskId);
    return {
      ok: true,
      output: {
        taskId: task.id,
        status: task.status,
        stdout: output.output,
        stderr: "",
        exitCode: output.exitCode,
        signal: output.signal ?? null,
        truncated: output.truncated,
      },
    };
  },
};
