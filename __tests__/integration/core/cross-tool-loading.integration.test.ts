import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverCustomTools } from "@/core/cross-tool/custom-tools-loader";
import { loadHookScripts } from "@/core/cross-tool/hooks-loader";
import { loadInstructions } from "@/core/cross-tool/instructions-loader";
import {
  loadAgentDefinitions,
  loadCommands,
  loadCursorRules,
  loadSkills,
} from "@/core/cross-tool/universal-loader";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Cross-Tool Loading Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `toadstool-cross-tool-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should load skills from .toadstool/skills/", async () => {
    const skillDir = join(tempDir, ".toadstool", "skills", "test-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: test-skill\ndescription: A test skill\n---\n\n## Usage\nDo the thing.",
      "utf8"
    );

    const skills = await loadSkills(tempDir);
    expect(skills).toHaveLength(1);
    expect(skills[0]?.name).toBe("test-skill");
    expect(skills[0]?.description).toBe("A test skill");
    expect(skills[0]?.source).toBe("TOADSTOOL");
  });

  it("should load commands from .toadstool/commands/", async () => {
    const cmdDir = join(tempDir, ".toadstool", "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(
      join(cmdDir, "test-cmd.md"),
      "---\ndescription: Run test\nagent: build\n---\n\nRun the test suite.",
      "utf8"
    );

    const commands = await loadCommands(tempDir);
    expect(commands).toHaveLength(1);
    expect(commands[0]?.name).toBe("test-cmd");
    expect(commands[0]?.agent).toBe("build");
  });

  it("should load agent definitions from .toadstool/agents/", async () => {
    const agentDir = join(tempDir, ".toadstool", "agents");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, "reviewer.md"),
      "---\nname: code-reviewer\ndescription: Reviews code\nmodel: claude-haiku\n---\n\nReview all changes.",
      "utf8"
    );

    const agents = await loadAgentDefinitions(tempDir);
    expect(agents).toHaveLength(1);
    expect(agents[0]?.name).toBe("code-reviewer");
    expect(agents[0]?.model).toBe("claude-haiku");
  });

  it("should load Cursor .mdc rules", async () => {
    const rulesDir = join(tempDir, ".cursor", "rules");
    await mkdir(rulesDir, { recursive: true });
    await writeFile(
      join(rulesDir, "style.mdc"),
      '---\ndescription: Code style\nglobs: ["**/*.ts"]\nalwaysApply: false\n---\n\nUse 2 spaces.',
      "utf8"
    );

    const rules = await loadCursorRules(tempDir);
    expect(rules).toHaveLength(1);
    expect(rules[0]?.type).toBe("auto_attached");
    expect(rules[0]?.globs).toContain("**/*.ts");
  });

  it("should discover custom tool files from .toadstool/tools/", async () => {
    const toolDir = join(tempDir, ".toadstool", "tools");
    await mkdir(toolDir, { recursive: true });
    await writeFile(join(toolDir, "my-tool.ts"), "export default {};", "utf8");

    const tools = await discoverCustomTools(tempDir);
    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("my-tool");
    expect(tools[0]?.extension).toBe(".ts");
  });

  it("should load instructions from file paths", async () => {
    const instrFile = join(tempDir, "RULES.md");
    await writeFile(instrFile, "# Rules\nFollow these.", "utf8");

    const instructions = await loadInstructions([instrFile], tempDir);
    expect(instructions).toHaveLength(1);
    expect(instructions[0]?.content).toContain("Follow these");
  });

  it("should return empty arrays for non-existent directories", async () => {
    const emptyDir = join(tempDir, "empty-project");
    await mkdir(emptyDir, { recursive: true });

    const skills = await loadSkills(emptyDir);
    const commands = await loadCommands(emptyDir);
    const agents = await loadAgentDefinitions(emptyDir);
    const rules = await loadCursorRules(emptyDir);
    const tools = await discoverCustomTools(emptyDir);
    const hooks = await loadHookScripts(emptyDir);

    expect(skills).toHaveLength(0);
    expect(commands).toHaveLength(0);
    expect(agents).toHaveLength(0);
    expect(rules).toHaveLength(0);
    expect(tools).toHaveLength(0);
    expect(hooks).toHaveLength(0);
  });
});
