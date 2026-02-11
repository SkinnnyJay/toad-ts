import {
  AGENT_MANAGEMENT_COMMAND,
  type AgentManagementCommand,
} from "@/constants/agent-management-commands";
import { z } from "zod";

export { AGENT_MANAGEMENT_COMMAND };
export type { AgentManagementCommand };

export const AgentManagementCommandSchema = z.enum([
  AGENT_MANAGEMENT_COMMAND.LOGIN,
  AGENT_MANAGEMENT_COMMAND.LOGOUT,
  AGENT_MANAGEMENT_COMMAND.STATUS,
  AGENT_MANAGEMENT_COMMAND.MODELS,
  AGENT_MANAGEMENT_COMMAND.MODEL,
  AGENT_MANAGEMENT_COMMAND.MCP,
  AGENT_MANAGEMENT_COMMAND.AGENT,
  AGENT_MANAGEMENT_COMMAND.LIST,
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

export const AgentManagementSessionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    createdAt: z.string().datetime().optional(),
    model: z.string().min(1).optional(),
    messageCount: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AgentManagementSession = z.infer<typeof AgentManagementSessionSchema>;
