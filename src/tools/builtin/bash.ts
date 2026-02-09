import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ShellCommandResult } from "@/tools/shell-session";
import type { ToolDefinition } from "@/tools/types";

const BashInputSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export type BashToolInput = z.infer<typeof BashInputSchema>;

export const bashTool: ToolDefinition<ShellCommandResult> = {
  name: TOOL_NAME.BASH,
  description: "Execute a shell command in a persistent session.",
  kind: TOOL_KIND.EXECUTE,
  inputSchema: BashInputSchema,
  execute: async (input, context) => {
    const parsed = BashInputSchema.parse(input);
    const result = await context.shell.execute(parsed.command, {
      cwd: parsed.cwd,
      timeoutMs: parsed.timeoutMs,
    });

    return { ok: true, output: result };
  },
};
