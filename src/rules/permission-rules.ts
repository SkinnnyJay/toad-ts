import { PERMISSION, type Permission } from "@/constants/permissions";
import { TOOL_KIND, type ToolKind } from "@/constants/tool-kinds";
import { z } from "zod";

export type PermissionRules = Partial<Record<ToolKind, Permission>>;

const permissionValueSchema = z.enum([PERMISSION.ALLOW, PERMISSION.DENY, PERMISSION.ASK]);

export const permissionRulesSchema = z
  .object({
    [TOOL_KIND.READ]: permissionValueSchema.optional(),
    [TOOL_KIND.EDIT]: permissionValueSchema.optional(),
    [TOOL_KIND.DELETE]: permissionValueSchema.optional(),
    [TOOL_KIND.MOVE]: permissionValueSchema.optional(),
    [TOOL_KIND.SEARCH]: permissionValueSchema.optional(),
    [TOOL_KIND.EXECUTE]: permissionValueSchema.optional(),
    [TOOL_KIND.THINK]: permissionValueSchema.optional(),
    [TOOL_KIND.FETCH]: permissionValueSchema.optional(),
    [TOOL_KIND.SWITCH_MODE]: permissionValueSchema.optional(),
    [TOOL_KIND.OTHER]: permissionValueSchema.optional(),
  })
  .strict();
