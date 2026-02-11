import { z } from "zod";

export const AGENT_MANAGEMENT_COMMAND = {
  LOGIN: "login",
  LOGOUT: "logout",
  STATUS: "status",
  MODELS: "models",
  MODEL: "model",
  MCP: "mcp",
  AGENT: "agent",
} as const;

export type AgentManagementCommand =
  (typeof AGENT_MANAGEMENT_COMMAND)[keyof typeof AGENT_MANAGEMENT_COMMAND];

export const AgentManagementCommandSchema = z.enum([
  AGENT_MANAGEMENT_COMMAND.LOGIN,
  AGENT_MANAGEMENT_COMMAND.LOGOUT,
  AGENT_MANAGEMENT_COMMAND.STATUS,
  AGENT_MANAGEMENT_COMMAND.MODELS,
  AGENT_MANAGEMENT_COMMAND.MODEL,
  AGENT_MANAGEMENT_COMMAND.MCP,
  AGENT_MANAGEMENT_COMMAND.AGENT,
]);

export const AgentManagementCommandRequestSchema = z
  .object({
    command: AgentManagementCommandSchema,
    args: z.array(z.string()).default([]),
  })
  .strict();

export type AgentManagementCommandRequest = z.infer<typeof AgentManagementCommandRequestSchema>;

export const AgentManagementCommandResultSchema = z
  .object({
    stdout: z.string(),
    stderr: z.string(),
    exitCode: z.number().int(),
  })
  .strict();

export type AgentManagementCommandResult = z.infer<typeof AgentManagementCommandResultSchema>;
