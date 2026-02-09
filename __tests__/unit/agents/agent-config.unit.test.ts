import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadAgentConfigs } from "@/agents/agent-config";
import { PERMISSION } from "@/constants/permissions";
import { SESSION_MODE } from "@/constants/session-modes";
import { TOOL_KIND } from "@/constants/tool-kinds";

const createAgentsDir = async (root: string): Promise<string> => {
  const dir = path.join(root, ".opencode", "agents");
  await mkdir(dir, { recursive: true });
  return dir;
};

describe("agent-config loader", () => {
  let projectRoot: string | null = null;

  afterEach(async () => {
    if (projectRoot) {
      await rm(projectRoot, { recursive: true, force: true });
      projectRoot = null;
    }
  });

  it("parses frontmatter and prompt body", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-agent-"));
    const agentsDir = await createAgentsDir(projectRoot);
    const filePath = path.join(agentsDir, "planner.md");

    await writeFile(
      filePath,
      [
        "---",
        "name: Planner",
        "description: Planning agent",
        "model: test-model",
        "temperature: 0.2",
        "mode: full-access",
        "tools:",
        "  read: allow",
        "  bash: ask",
        "---",
        "",
        "System prompt goes here.",
      ].join("\n")
    );

    const configs = await loadAgentConfigs({
      projectRoot,
      defaultHarnessId: "mock",
    });

    expect(configs).toHaveLength(1);
    const [config] = configs;
    expect(config?.id).toBe("planner");
    expect(config?.name).toBe("Planner");
    expect(config?.harnessId).toBe("mock");
    expect(config?.description).toBe("Planning agent");
    expect(config?.model).toBe("test-model");
    expect(config?.temperature).toBe(0.2);
    expect(config?.sessionMode).toBe(SESSION_MODE.FULL_ACCESS);
    expect(config?.permissions).toEqual({
      [TOOL_KIND.READ]: PERMISSION.ALLOW,
      [TOOL_KIND.EXECUTE]: PERMISSION.ASK,
    });
    expect(config?.prompt).toBe("System prompt goes here.");
  });

  it("returns empty list when no agents exist", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-agent-empty-"));
    const configs = await loadAgentConfigs({ projectRoot, defaultHarnessId: "mock" });
    expect(configs).toEqual([]);
  });
});
