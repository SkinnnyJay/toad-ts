import { z } from "zod";

import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import type { ToolDefinition } from "@/tools/types";

const WebFetchInputSchema = z.object({
  url: z.string().url(),
  method: z.string().min(1).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export type WebFetchToolInput = z.infer<typeof WebFetchInputSchema>;

export interface WebFetchToolOutput {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  truncated: boolean;
}

const truncateBody = (body: string): { body: string; truncated: boolean } => {
  if (body.length <= LIMIT.WEBFETCH_MAX_CHARS) {
    return { body, truncated: false };
  }
  return { body: body.slice(0, LIMIT.WEBFETCH_MAX_CHARS), truncated: true };
};

export const webfetchTool: ToolDefinition<WebFetchToolOutput> = {
  name: TOOL_NAME.WEBFETCH,
  description: "Fetch content from a URL over HTTP.",
  kind: TOOL_KIND.FETCH,
  inputSchema: WebFetchInputSchema,
  execute: async (input, context) => {
    const parsed = WebFetchInputSchema.parse(input);
    const controller = new AbortController();
    const timeout = parsed.timeoutMs ?? TIMEOUT.WEBFETCH_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await context.fetcher(parsed.url, {
        method: parsed.method ?? "GET",
        headers: parsed.headers,
        body: parsed.body,
        signal: controller.signal,
      });
      const rawBody = await response.text();
      const { body, truncated } = truncateBody(rawBody);
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return {
        ok: true,
        output: {
          status: response.status,
          statusText: response.statusText,
          headers,
          body,
          truncated,
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
