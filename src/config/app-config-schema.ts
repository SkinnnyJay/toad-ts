import { BREADCRUMB_PLACEMENT_VALUES } from "@/constants/breadcrumb-placement";
import { HOOK_EVENT } from "@/constants/hook-events";
import { HOOK_TYPE } from "@/constants/hook-types";
import { z } from "zod";

export const keybindsSchema = z
  .object({
    leader: z.string().min(1).optional(),
    bindings: z.record(z.string()).optional(),
  })
  .strict();

export const defaultsSchema = z
  .object({
    agent: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
  })
  .strict();

export const vimSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .strict();

const hookDefinitionSchema = z
  .object({
    type: z.enum([HOOK_TYPE.COMMAND, HOOK_TYPE.PROMPT]),
    command: z.string().min(1).optional(),
    prompt: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === HOOK_TYPE.COMMAND && !value.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Command hook requires a command value.",
      });
    }
    if (value.type === HOOK_TYPE.PROMPT && !value.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Prompt hook requires a prompt value.",
      });
    }
  });

const hookGroupSchema = z
  .object({
    matcher: z.string().min(1).optional(),
    hooks: z.array(hookDefinitionSchema).default([]),
  })
  .strict();

export const hooksSchema = z
  .object({
    [HOOK_EVENT.SESSION_START]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.PRE_TOOL_USE]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.POST_TOOL_USE]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.PERMISSION_REQUEST]: z.array(hookGroupSchema).optional(),
    [HOOK_EVENT.STOP]: z.array(hookGroupSchema).optional(),
  })
  .strict();

const routingRuleSchema = z
  .object({
    matcher: z.string().min(1),
    agentId: z.string().min(1),
  })
  .strict();

export const routingSchema = z
  .object({
    rules: z.array(routingRuleSchema).default([]),
  })
  .strict();

export const compactionSchema = z
  .object({
    auto: z.boolean().optional(),
    threshold: z.number().min(0).max(1).optional(),
    prune: z.boolean().optional(),
    preserveRecent: z.number().int().nonnegative().optional(),
  })
  .strict();

export const permissionsSchema = z
  .object({
    mode: z.enum(["auto-accept", "plan", "normal"]).optional(),
    rules: z.record(z.enum(["allow", "deny", "ask"])).optional(),
  })
  .strict();

export const themeSchema = z
  .object({
    name: z.string().min(1).optional(),
    file: z.string().min(1).optional(),
  })
  .strict();

export const providerConfigSchema = z
  .object({
    enabled: z.array(z.string()).optional(),
    disabled: z.array(z.string()).optional(),
    smallModel: z.string().min(1).optional(),
  })
  .strict();

export const compatibilitySchema = z
  .object({
    claude: z.boolean().optional(),
    cursor: z.boolean().optional(),
    gemini: z.boolean().optional(),
    opencode: z.boolean().optional(),
    disabledTools: z.array(z.string()).optional(),
  })
  .strict();

export const shareSchema = z
  .object({
    mode: z.enum(["manual", "auto", "disabled"]).optional(),
  })
  .strict();

export const formatterSchema = z
  .object({
    command: z.array(z.string()).optional(),
    extensions: z.array(z.string()).optional(),
    disabled: z.boolean().optional(),
  })
  .strict();

export const breadcrumbSchema = z
  .object({
    placement: z.enum(BREADCRUMB_PLACEMENT_VALUES).optional(),
    pollIntervalMs: z.number().int().positive().optional(),
    showAction: z.boolean().optional(),
  })
  .strict();

export const uiSchema = z
  .object({
    breadcrumb: breadcrumbSchema.optional(),
  })
  .strict();

export const appConfigSchema = z
  .object({
    defaults: defaultsSchema.optional(),
    keybinds: keybindsSchema.optional(),
    vim: vimSchema.optional(),
    hooks: hooksSchema.optional(),
    routing: routingSchema.optional(),
    compaction: compactionSchema.optional(),
    permissions: permissionsSchema.optional(),
    theme: themeSchema.optional(),
    providers: providerConfigSchema.optional(),
    compatibility: compatibilitySchema.optional(),
    formatters: z.record(formatterSchema).optional(),
    instructions: z.array(z.string()).optional(),
    share: shareSchema.optional(),
    ui: uiSchema.optional(),
  })
  .strict();

export type KeybindConfig = z.infer<typeof keybindsSchema>;
export type AppConfigDefaults = z.infer<typeof defaultsSchema>;
export type VimConfig = z.infer<typeof vimSchema>;
export type HookDefinition = z.infer<typeof hookDefinitionSchema>;
export type HookGroup = z.infer<typeof hookGroupSchema>;
export type HooksConfig = z.infer<typeof hooksSchema>;
export type RoutingRule = z.infer<typeof routingRuleSchema>;
export type RoutingConfig = z.infer<typeof routingSchema>;
export type CompactionConfig = z.infer<typeof compactionSchema>;
export type PermissionsConfig = z.infer<typeof permissionsSchema>;
export type ThemeConfig = z.infer<typeof themeSchema>;
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type CompatibilityConfig = z.infer<typeof compatibilitySchema>;
export type FormatterConfig = z.infer<typeof formatterSchema>;
export type BreadcrumbConfig = z.infer<typeof breadcrumbSchema>;
export type UiConfig = z.infer<typeof uiSchema>;
export type AppConfigInput = z.infer<typeof appConfigSchema>;
