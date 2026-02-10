import { createInterface } from "node:readline/promises";
import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ToolDefinition } from "@/tools/types";
import { EnvManager } from "@/utils/env/env.utils";

const QuestionInputSchema = z.object({
  question: z.string().min(1),
  default: z.string().optional(),
});

export type QuestionToolInput = z.infer<typeof QuestionInputSchema>;

export interface QuestionToolOutput {
  answer: string;
}

const resolveFallback = (value: string | undefined): string => value ?? "";

export const questionTool: ToolDefinition<QuestionToolOutput> = {
  name: TOOL_NAME.QUESTION,
  description: "Ask the user a question and return their response.",
  kind: TOOL_KIND.THINK,
  inputSchema: QuestionInputSchema,
  execute: async (input) => {
    const parsed = QuestionInputSchema.parse(input);
    const fallback = resolveFallback(parsed.default);
    if (EnvManager.getInstance().getEnvironment() === "test") {
      return { ok: true, output: { answer: fallback } };
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      return { ok: true, output: { answer: fallback } };
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = await rl.question(`${parsed.question} `);
      return {
        ok: true,
        output: {
          answer: answer.trim() || fallback,
        },
      };
    } finally {
      rl.close();
    }
  },
};
