import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { load } from "js-yaml";
import { z } from "zod";

import { PERMISSION } from "@/constants/permissions";
import type { Permission } from "@/constants/permissions";
import { TOOL_KIND, type ToolKind } from "@/constants/tool-kinds";
import type { ToolPermissionOverrides } from "@/tools/permissions";
import type { AgentId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";

export interface AgentConfig {
  id: AgentId;
  name: string;
  harnessId: string;
  description?: string;
  model?: string;
  temperature?: number;
  mode?: string;
  permissions?: ToolPermissionOverrides;
  prompt?: string;
}

const permissionValueSchema = z.enum([PERMISSION.ALLOW, PERMISSION.ASK, PERMISSION.DENY]);

const agentFrontmatterSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    harness: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    temperature: z.number().nonnegative().optional(),
    mode: z.string().min(1).optional(),
    tools: z.record(permissionValueSchema).optional(),
  })
  .strict();

const TOOL_KIND_VALUES: ToolKind[] = [
  TOOL_KIND.READ,
  TOOL_KIND.EDIT,
  TOOL_KIND.DELETE,
  TOOL_KIND.MOVE,
  TOOL_KIND.SEARCH,
  TOOL_KIND.EXECUTE,
  TOOL_KIND.THINK,
  TOOL_KIND.FETCH,
  TOOL_KIND.SWITCH_MODE,
  TOOL_KIND.OTHER,
];

const TOOL_KIND_ALIASES: Record<string, ToolKind> = {
  read: TOOL_KIND.READ,
  write: TOOL_KIND.EDIT,
  edit: TOOL_KIND.EDIT,
  patch: TOOL_KIND.EDIT,
  exec: TOOL_KIND.EXECUTE,
  execute: TOOL_KIND.EXECUTE,
  bash: TOOL_KIND.EXECUTE,
  search: TOOL_KIND.SEARCH,
  grep: TOOL_KIND.SEARCH,
  glob: TOOL_KIND.SEARCH,
  list: TOOL_KIND.READ,
  fetch: TOOL_KIND.FETCH,
  webfetch: TOOL_KIND.FETCH,
  todo: TOOL_KIND.EDIT,
  question: TOOL_KIND.THINK,
  think: TOOL_KIND.THINK,
  move: TOOL_KIND.MOVE,
  delete: TOOL_KIND.DELETE,
  switch_mode: TOOL_KIND.SWITCH_MODE,
  "switch-mode": TOOL_KIND.SWITCH_MODE,
};

const parseFrontmatter = (content: string): { frontmatter: unknown; body: string } => {
  if (!content.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const raw = match[1] ?? "";
  const body = content.slice(match[0].length);
  const frontmatter = load(raw) ?? {};
  return { frontmatter, body };
};

const resolveToolKind = (key: string): ToolKind | undefined => {
  const normalized = key.trim().toLowerCase();
  const alias = TOOL_KIND_ALIASES[normalized];
  if (alias) return alias;
  return TOOL_KIND_VALUES.find((kind) => kind === normalized);
};

const normalizeToolPermissions = (
  tools: Record<string, Permission> | undefined
): ToolPermissionOverrides | undefined => {
  if (!tools) return undefined;
  const overrides: ToolPermissionOverrides = {};
  for (const [key, value] of Object.entries(tools)) {
    const kind = resolveToolKind(key);
    if (!kind) continue;
    overrides[kind] = value;
  }
  return Object.keys(overrides).length > 0 ? overrides : undefined;
};

const buildAgentConfig = (params: {
  id: string;
  name: string;
  harnessId: string;
  description?: string;
  model?: string;
  temperature?: number;
  mode?: string;
  permissions?: ToolPermissionOverrides;
  prompt?: string;
}): AgentConfig => {
  return {
    id: AgentIdSchema.parse(params.id),
    name: params.name,
    harnessId: params.harnessId,
    description: params.description,
    model: params.model,
    temperature: params.temperature,
    mode: params.mode,
    permissions: params.permissions,
    prompt: params.prompt,
  };
};

const resolveAgentId = (frontmatterId: string | undefined, filePath: string): string => {
  if (frontmatterId) return frontmatterId;
  const stem = path.basename(filePath, path.extname(filePath));
  if (!stem) {
    throw new Error(`Agent file missing id: ${filePath}`);
  }
  return stem;
};

export interface AgentConfigLoaderOptions {
  projectRoot?: string;
  defaultHarnessId?: string;
}

export const loadAgentConfigs = async (
  options: AgentConfigLoaderOptions = {}
): Promise<AgentConfig[]> => {
  const projectRoot = options.projectRoot ?? process.cwd();
  const agentsDir = path.join(projectRoot, ".opencode", "agents");
  const files = await fg("**/*.md", { cwd: agentsDir, absolute: true, dot: false });
  if (files.length === 0) {
    return [];
  }

  const configs: AgentConfig[] = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    const parsed = agentFrontmatterSchema.parse(frontmatter);
    const harnessId = parsed.harness ?? options.defaultHarnessId;
    if (!harnessId) {
      throw new Error(`Agent ${filePath} missing harness id.`);
    }
    const id = resolveAgentId(parsed.id, filePath);
    const name = parsed.name ?? id;
    const permissions = normalizeToolPermissions(parsed.tools);
    const prompt = body.trim().length > 0 ? body.trim() : undefined;
    configs.push(
      buildAgentConfig({
        id,
        name,
        harnessId,
        description: parsed.description,
        model: parsed.model,
        temperature: parsed.temperature,
        mode: parsed.mode,
        permissions,
        prompt,
      })
    );
  }

  return configs;
};
