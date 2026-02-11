import { AgentIdSchema } from "@/types/domain";
import { z } from "zod";

export const defaultProviderSchema = z
  .object({
    agentId: AgentIdSchema,
    modelId: z.string().min(1).optional(),
  })
  .strict();

export type DefaultProvider = z.infer<typeof defaultProviderSchema>;

export const recentCommandNamesSchema = z.array(z.string().min(1)).max(20).default([]);

export const settingsSchema = z
  .object({
    defaultProvider: defaultProviderSchema.optional(),
    /** Command/skill names in recency order (most recent last); used for "Recently used" in palette. */
    recentCommandNames: recentCommandNamesSchema.optional(),
  })
  .strict();

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  defaultProvider: undefined,
  recentCommandNames: [],
};
