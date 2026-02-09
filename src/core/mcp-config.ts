import { MCP_SERVER_TYPE } from "@/constants/mcp-server-types";
import { type McpServer, McpServerSchema } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { z } from "zod";

export type EnvSource = Record<string, string | undefined>;

const mcpServerInputSchema = z
  .object({
    type: z.enum([MCP_SERVER_TYPE.HTTP, MCP_SERVER_TYPE.SSE]).optional(),
    url: z.string().min(1).optional(),
    headers: z.record(z.string().min(1), z.string()).optional(),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string().min(1), z.string()).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasUrlConfig =
      value.url !== undefined || value.headers !== undefined || value.type !== undefined;
    const hasCommandConfig =
      value.command !== undefined || value.args !== undefined || value.env !== undefined;

    if (!hasUrlConfig && !hasCommandConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MCP server config requires either url or command settings",
      });
      return;
    }

    if (hasUrlConfig && hasCommandConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MCP server config cannot mix url and command settings",
      });
      return;
    }

    if (hasCommandConfig && !value.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MCP stdio config requires a command",
      });
      return;
    }

    if (hasUrlConfig && !value.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MCP http/sse config requires a url",
      });
    }
  });

type McpServerInput = z.infer<typeof mcpServerInputSchema>;

export const mcpConfigSchema = z
  .object({
    mcpServers: z.record(z.string().min(1), mcpServerInputSchema).default({}),
  })
  .strict();

export type McpConfigInput = z.infer<typeof mcpConfigSchema>;

const ENV_PATTERN = /\$(?:\{([A-Z0-9_]+)\}|([A-Z0-9_]+))/g;
const ESCAPED_DOLLAR = "__TOADSTOOL_ESCAPED_DOLLAR__";

export function expandEnvValue(value: string, env: EnvSource): string {
  const withEscapes = value.replace(/\$\$/g, ESCAPED_DOLLAR);
  const expanded = withEscapes.replace(ENV_PATTERN, (_, braced, bare) => {
    const key = braced ?? bare;
    const resolved = env[key];
    if (resolved === undefined) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return resolved;
  });
  return expanded.split(ESCAPED_DOLLAR).join("$");
}

export function parseMcpConfig(
  rawConfig: unknown,
  env: EnvSource = EnvManager.getInstance().getSnapshot()
): McpServer[] {
  if (rawConfig === undefined || rawConfig === null) {
    return [];
  }
  const parsed = mcpConfigSchema.parse(rawConfig);
  return Object.entries(parsed.mcpServers).map(([name, config]) =>
    buildMcpServer(name, config, env)
  );
}

function buildMcpServer(name: string, config: McpServerInput, env: EnvSource): McpServer {
  if (config.command) {
    const command = expandEnvValue(config.command, env);
    const args = (config.args ?? []).map((arg) => expandEnvValue(arg, env));
    const envVars = Object.entries(config.env ?? {}).map(([key, value]) => ({
      name: key,
      value: expandEnvValue(value, env),
    }));
    return McpServerSchema.parse({ name, command, args, env: envVars });
  }

  if (!config.url) {
    throw new Error(`MCP server ${name} is missing a url`);
  }

  const type = config.type ?? MCP_SERVER_TYPE.HTTP;
  const url = expandEnvValue(config.url, env);
  const headers = Object.entries(config.headers ?? {}).map(([key, value]) => ({
    name: key,
    value: expandEnvValue(value, env),
  }));
  return McpServerSchema.parse({ type, name, url, headers });
}
