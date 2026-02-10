import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { getDiscoveryLocations, getOpenCodeCommandPath } from "./discovery-paths";

const logger = createClassLogger("UniversalLoader");

// ── Skill Loader ──────────────────────────────────────────────────────────────

export interface LoadedSkill {
  name: string;
  description: string;
  content: string;
  source: string;
  filePath: string;
}

const parseSkillFrontmatter = (
  raw: string
): { name?: string; description?: string; body: string } => {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { body: raw };
  const frontmatter = match[1] ?? "";
  const body = match[2] ?? "";
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
    body,
  };
};

export const loadSkills = async (cwd: string): Promise<LoadedSkill[]> => {
  const locations = getDiscoveryLocations(cwd, "skills");
  const skills = new Map<string, LoadedSkill>();

  for (const location of locations) {
    try {
      const entries = await readdir(location.dir);
      for (const entry of entries) {
        const skillDir = join(location.dir, entry);
        const skillFile = join(skillDir, "SKILL.md");
        try {
          const skillStat = await stat(skillFile);
          if (!skillStat.isFile()) continue;
          const content = await readFile(skillFile, ENCODING.UTF8);
          const parsed = parseSkillFrontmatter(content);
          const name = parsed.name ?? entry;
          if (!skills.has(name)) {
            skills.set(name, {
              name,
              description: parsed.description ?? "",
              content: parsed.body,
              source: location.source,
              filePath: skillFile,
            });
          }
        } catch {
          // Skip non-existent or unreadable skill files
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Loaded skills", { count: skills.size });
  return Array.from(skills.values());
};

// ── Command Loader ────────────────────────────────────────────────────────────

export interface LoadedCommand {
  name: string;
  description: string;
  content: string;
  agent?: string;
  model?: string;
  source: string;
  filePath: string;
}

const parseCommandFrontmatter = (
  raw: string
): { description?: string; agent?: string; model?: string; body: string } => {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { body: raw };
  const frontmatter = match[1] ?? "";
  const body = match[2] ?? "";
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const agentMatch = frontmatter.match(/^agent:\s*(.+)$/m);
  const modelMatch = frontmatter.match(/^model:\s*(.+)$/m);
  return {
    description: descMatch?.[1]?.trim(),
    agent: agentMatch?.[1]?.trim(),
    model: modelMatch?.[1]?.trim(),
    body,
  };
};

export const loadCommands = async (cwd: string): Promise<LoadedCommand[]> => {
  const locations = getDiscoveryLocations(cwd, "commands");
  // OpenCode uses singular "command" dir
  locations.push({
    source: "OPENCODE",
    dir: getOpenCodeCommandPath(cwd),
    scope: "project",
  });

  const commands = new Map<string, LoadedCommand>();

  for (const location of locations) {
    try {
      const entries = await readdir(location.dir);
      for (const entry of entries) {
        if (!entry.endsWith(".md")) continue;
        const filePath = join(location.dir, entry);
        try {
          const content = await readFile(filePath, ENCODING.UTF8);
          const parsed = parseCommandFrontmatter(content);
          const name = basename(entry, extname(entry));
          if (!commands.has(name)) {
            commands.set(name, {
              name,
              description: parsed.description ?? name,
              content: parsed.body,
              agent: parsed.agent,
              model: parsed.model,
              source: location.source,
              filePath,
            });
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Loaded commands", { count: commands.size });
  return Array.from(commands.values());
};

// ── Agent Loader ──────────────────────────────────────────────────────────────

export interface LoadedAgentDefinition {
  name: string;
  description: string;
  content: string;
  model?: string;
  temperature?: number;
  tools?: string[];
  source: string;
  filePath: string;
}

const parseAgentFrontmatter = (
  raw: string
): {
  name?: string;
  description?: string;
  model?: string;
  temperature?: number;
  tools?: string[];
  body: string;
} => {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { body: raw };
  const frontmatter = match[1] ?? "";
  const body = match[2] ?? "";
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const modelMatch = frontmatter.match(/^model:\s*(.+)$/m);
  const tempMatch = frontmatter.match(/^temperature:\s*(.+)$/m);
  const toolsMatch = frontmatter.match(/^tools:\s*\[([^\]]*)\]/m);
  return {
    name: nameMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim(),
    model: modelMatch?.[1]?.trim(),
    temperature: tempMatch?.[1] ? Number.parseFloat(tempMatch[1]) : undefined,
    tools: toolsMatch?.[1]
      ?.split(",")
      .map((t) => t.trim().replace(/['"]/g, ""))
      .filter(Boolean),
    body,
  };
};

export const loadAgentDefinitions = async (cwd: string): Promise<LoadedAgentDefinition[]> => {
  const locations = getDiscoveryLocations(cwd, "agents");
  const agents = new Map<string, LoadedAgentDefinition>();

  for (const location of locations) {
    try {
      const entries = await readdir(location.dir);
      for (const entry of entries) {
        if (!entry.endsWith(".md")) continue;
        const filePath = join(location.dir, entry);
        try {
          const content = await readFile(filePath, ENCODING.UTF8);
          const parsed = parseAgentFrontmatter(content);
          const name = parsed.name ?? basename(entry, extname(entry));
          if (!agents.has(name)) {
            agents.set(name, {
              name,
              description: parsed.description ?? "",
              content: parsed.body,
              model: parsed.model,
              temperature: parsed.temperature,
              tools: parsed.tools,
              source: location.source,
              filePath,
            });
          }
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Skip non-existent directories
    }
  }

  logger.info("Loaded agent definitions", { count: agents.size });
  return Array.from(agents.values());
};

// ── Cursor .mdc Rule Parser ──────────────────────────────────────────────────

export interface LoadedRule {
  description: string;
  globs: string[];
  alwaysApply: boolean;
  content: string;
  type: "always" | "auto_attached" | "agent_requested";
  source: string;
  filePath: string;
}

const parseMdcFrontmatter = (
  raw: string
): { description?: string; globs?: string[]; alwaysApply?: boolean; body: string } => {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { body: raw };
  const frontmatter = match[1] ?? "";
  const body = match[2] ?? "";
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const globsMatch = frontmatter.match(/^globs:\s*\[([^\]]*)\]/m);
  const alwaysMatch = frontmatter.match(/^alwaysApply:\s*(true|false)/m);
  const globs = globsMatch?.[1]
    ?.split(",")
    .map((g) => g.trim().replace(/['"]/g, ""))
    .filter(Boolean);
  return {
    description: descMatch?.[1]?.trim(),
    globs,
    alwaysApply: alwaysMatch?.[1] === "true",
    body,
  };
};

export const loadCursorRules = async (cwd: string): Promise<LoadedRule[]> => {
  const rulesDir = join(cwd, ".cursor", "rules");
  const rules: LoadedRule[] = [];

  try {
    const entries = await readdir(rulesDir);
    for (const entry of entries) {
      if (!entry.endsWith(".mdc") && !entry.endsWith(".md")) continue;
      const filePath = join(rulesDir, entry);
      try {
        const content = await readFile(filePath, ENCODING.UTF8);
        const parsed = parseMdcFrontmatter(content);
        let type: LoadedRule["type"] = "agent_requested";
        if (parsed.alwaysApply) {
          type = "always";
        } else if (parsed.globs && parsed.globs.length > 0) {
          type = "auto_attached";
        }
        rules.push({
          description: parsed.description ?? basename(entry, extname(entry)),
          globs: parsed.globs ?? [],
          alwaysApply: parsed.alwaysApply ?? false,
          content: parsed.body,
          type,
          source: "CURSOR",
          filePath,
        });
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // No .cursor/rules directory
  }

  logger.info("Loaded Cursor rules", { count: rules.length });
  return rules;
};
