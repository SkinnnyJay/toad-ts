import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadHarnessConfig } from "@/harness/harnessConfig";

const writeHarnessFile = async (root: string, data: unknown): Promise<string> => {
  const dir = path.join(root, ".toad");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "harnesses.json");
  await writeFile(filePath, JSON.stringify(data, null, 2));
  return filePath;
};

describe("harnessConfig", () => {
  let projectRoot: string | null = null;
  let userRoot: string | null = null;

  afterEach(async () => {
    if (projectRoot) {
      await rm(projectRoot, { recursive: true, force: true });
    }
    if (userRoot) {
      await rm(userRoot, { recursive: true, force: true });
    }
    projectRoot = null;
    userRoot = null;
  });

  it("applies project, user, and CLI precedence", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toad-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toad-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "claude",
      harnesses: {
        claude: {
          name: "Claude",
          command: "claude",
          args: ["--project"],
        },
        goose: {
          name: "Goose",
          command: "goose",
        },
      },
    });

    await writeHarnessFile(userRoot, {
      defaultHarness: "goose",
      harnesses: {
        claude: {
          command: "claude-user",
          args: ["--user"],
        },
      },
    });

    const result = await loadHarnessConfig({
      projectRoot,
      homedir: userRoot,
      harnessId: "claude",
    });

    expect(result.harnessId).toBe("claude");
    expect(result.harness.command).toBe("claude-user");
    expect(result.harness.args).toEqual(["--user"]);
    expect(result.harness.name).toBe("Claude");
  });

  it("expands environment variables in config values", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toad-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toad-user-"));

    await writeHarnessFile(projectRoot, {
      harnesses: {
        claude: {
          name: "Claude",
          command: "$HARNESS_CMD",
          args: ["--token=${TOKEN}", "--path=$ROOT_DIR"],
          env: {
            API_KEY: "${TOKEN}",
          },
          cwd: "$ROOT_DIR",
        },
      },
    });

    const result = await loadHarnessConfig({
      projectRoot,
      homedir: userRoot,
      env: {
        HARNESS_CMD: "claude",
        TOKEN: "abc123",
        ROOT_DIR: "/tmp/project",
      },
    });

    expect(result.harness.command).toBe("claude");
    expect(result.harness.args).toEqual(["--token=abc123", "--path=/tmp/project"]);
    expect(result.harness.env).toEqual({ API_KEY: "abc123" });
    expect(result.harness.cwd).toBe("/tmp/project");
  });

  it("uses CLI config path overrides", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toad-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toad-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "claude",
      harnesses: {
        claude: {
          name: "Claude",
          command: "claude",
        },
      },
    });

    const customPath = path.join(projectRoot, "custom-harness.json");
    await writeFile(
      customPath,
      JSON.stringify(
        {
          defaultHarness: "goose",
          harnesses: {
            goose: {
              name: "Goose",
              command: "goose",
            },
          },
        },
        null,
        2
      )
    );

    const result = await loadHarnessConfig({
      projectRoot,
      homedir: userRoot,
      configPath: customPath,
    });

    expect(result.harnessId).toBe("goose");
    expect(result.harness.command).toBe("goose");
  });

  it("throws on invalid harness definitions", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toad-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toad-user-"));

    await writeHarnessFile(projectRoot, {
      harnesses: {
        broken: {
          name: "Broken",
        },
      },
    });

    await expect(
      loadHarnessConfig({
        projectRoot,
        homedir: userRoot,
      })
    ).rejects.toThrow();
  });
});
