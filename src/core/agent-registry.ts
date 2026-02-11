import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("AgentRegistry");

export interface RegistryAgent {
  name: string;
  description: string;
  model: string;
  category: "coding" | "review" | "planning" | "general" | "specialized";
  template: string;
}

/**
 * Curated list of default agents available for one-command install.
 */
export const CURATED_AGENTS: RegistryAgent[] = [
  {
    name: "code-reviewer",
    description: "Thorough code reviewer that checks for bugs, style issues, and security",
    model: "claude-sonnet-4-20250514",
    category: "review",
    template: `---
name: code-reviewer
description: Thorough code reviewer
model: claude-sonnet-4-20250514
tools: [read, grep, glob, list]
---

You are a thorough code reviewer. When asked to review code:
1. Check for bugs and logic errors
2. Verify error handling
3. Check for security vulnerabilities
4. Suggest improvements for readability
5. Note any missing tests
`,
  },
  {
    name: "test-writer",
    description: "Generates comprehensive unit and integration tests",
    model: "claude-sonnet-4-20250514",
    category: "coding",
    template: `---
name: test-writer
description: Generates comprehensive tests
model: claude-sonnet-4-20250514
tools: [read, write, grep, glob, list, bash]
---

You are a test writing specialist. When asked to write tests:
1. Analyze the code under test thoroughly
2. Write unit tests covering happy path and edge cases
3. Add integration tests for cross-module behavior
4. Use the project's existing test framework and patterns
5. Target >= 95% coverage on the code under test
`,
  },
  {
    name: "refactorer",
    description: "Refactors code for clarity, performance, and maintainability",
    model: "claude-sonnet-4-20250514",
    category: "coding",
    template: `---
name: refactorer
description: Code refactoring specialist
model: claude-sonnet-4-20250514
tools: [read, write, edit, grep, glob, list, bash]
---

You are a refactoring specialist. When asked to refactor:
1. Identify code smells and complexity issues
2. Apply appropriate design patterns
3. Break large functions/files into smaller, focused units
4. Improve naming for clarity
5. Ensure all existing tests still pass after changes
`,
  },
  {
    name: "security-auditor",
    description: "Security-focused code auditor checking for vulnerabilities",
    model: "claude-sonnet-4-20250514",
    category: "review",
    template: `---
name: security-auditor
description: Security vulnerability auditor
model: claude-sonnet-4-20250514
tools: [read, grep, glob, list]
---

You are a security auditor. When reviewing code:
1. Check for injection vulnerabilities (SQL, XSS, command injection)
2. Verify authentication and authorization patterns
3. Check for credential exposure or secrets in code
4. Identify insecure data handling
5. Review dependency security (known CVEs)
`,
  },
  {
    name: "documenter",
    description: "Generates and improves code documentation",
    model: "claude-haiku-4-20250514",
    category: "general",
    template: `---
name: documenter
description: Documentation writer
model: claude-haiku-4-20250514
tools: [read, write, grep, glob, list]
---

You are a documentation specialist. When asked to document:
1. Add JSDoc comments to public APIs
2. Write clear README sections
3. Add inline comments explaining "why" not "what"
4. Generate API reference documentation
5. Create usage examples
`,
  },
  {
    name: "planner",
    description: "Creates implementation plans and task breakdowns",
    model: "claude-sonnet-4-20250514",
    category: "planning",
    template: `---
name: planner
description: Implementation planner
model: claude-sonnet-4-20250514
tools: [read, grep, glob, list, todo_write, todo_read]
---

You are a planning specialist. When asked to plan:
1. Break down the task into clear, ordered steps
2. Identify dependencies between steps
3. Estimate complexity of each step
4. Create a todo list with priorities
5. Identify risks and edge cases
`,
  },
];

/**
 * Install an agent from the curated registry by writing its template
 * to the .toadstool/agents/ directory.
 */
export const installAgent = async (
  agentName: string,
  targetDir: string
): Promise<{ installed: boolean; filePath?: string; error?: string }> => {
  const agent = CURATED_AGENTS.find((a) => a.name === agentName);
  if (!agent) {
    const available = CURATED_AGENTS.map((a) => a.name).join(", ");
    return { installed: false, error: `Agent "${agentName}" not found. Available: ${available}` };
  }

  const agentsDir = join(targetDir, ".toadstool", "agents");
  await mkdir(agentsDir, { recursive: true });
  const filePath = join(agentsDir, `${agent.name}.md`);
  await writeFile(filePath, agent.template.trim(), ENCODING.UTF8);

  logger.info("Installed agent", { name: agent.name, path: filePath });
  return { installed: true, filePath };
};

/**
 * List all available agents in the curated registry.
 */
export const listRegistryAgents = (): RegistryAgent[] => CURATED_AGENTS;
