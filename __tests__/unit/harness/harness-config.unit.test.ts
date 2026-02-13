import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FILE_PATH } from "@/constants/file-paths";
import {
  formatHarnessNotFoundError,
  formatInvalidHarnessIdError,
} from "@/harness/harness-error-messages";
import { CLI_AGENT_MODE } from "@/types/cli-agent.types";
import { afterEach, describe, expect, it } from "vitest";

import { HARNESS_CONFIG_ERROR, loadHarnessConfig } from "@/harness/harnessConfig";

const writeHarnessFile = async (root: string, data: unknown): Promise<string> => {
  const dir = path.join(root, ".toadstool");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, FILE_PATH.HARNESSES_JSON);
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
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

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
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

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

  it("merges project and user env maps before expansion", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "claude",
      harnesses: {
        claude: {
          name: "Claude",
          command: "claude",
          env: {
            PROJECT_TOKEN: "$PROJECT_TOKEN",
            SHARED: "project",
          },
        },
      },
    });

    await writeHarnessFile(userRoot, {
      harnesses: {
        claude: {
          env: {
            SHARED: "$USER_SHARED",
            USER_ONLY: "$USER_ONLY",
          },
        },
      },
    });

    const result = await loadHarnessConfig({
      projectRoot,
      homedir: userRoot,
      env: {
        PROJECT_TOKEN: "project-secret",
        USER_SHARED: "user-wins",
        USER_ONLY: "from-user",
      },
    });

    expect(result.harness.env).toEqual({
      PROJECT_TOKEN: "project-secret",
      SHARED: "user-wins",
      USER_ONLY: "from-user",
    });
  });

  it("merges permission overrides", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "claude",
      harnesses: {
        claude: {
          name: "Claude",
          command: "claude",
          permissions: {
            read: "allow",
            execute: "ask",
          },
        },
      },
    });

    await writeHarnessFile(userRoot, {
      harnesses: {
        claude: {
          permissions: {
            execute: "deny",
          },
        },
      },
    });

    const result = await loadHarnessConfig({ projectRoot, homedir: userRoot });
    expect(result.harness.permissions).toEqual({
      read: "allow",
      execute: "deny",
    });
  });

  it("uses CLI config path overrides", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

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
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

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

  it("throws when env expansion empties required command", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "claude",
      harnesses: {
        claude: {
          name: "Claude",
          command: "$MISSING_COMMAND",
        },
      },
    });

    await expect(
      loadHarnessConfig({
        projectRoot,
        homedir: userRoot,
        env: {},
      })
    ).rejects.toThrow();
  });

  it("merges cursor harness options and expands cursor model env values", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "cursor",
      harnesses: {
        cursor: {
          name: "Cursor",
          command: "cursor-agent",
          cursor: {
            model: "$CURSOR_MODEL",
            mode: CLI_AGENT_MODE.AGENT,
            force: false,
          },
        },
      },
    });

    await writeHarnessFile(userRoot, {
      harnesses: {
        cursor: {
          cursor: {
            mode: CLI_AGENT_MODE.PLAN,
            force: true,
            browser: true,
          },
        },
      },
    });

    const result = await loadHarnessConfig({
      projectRoot,
      homedir: userRoot,
      env: {
        CURSOR_MODEL: "gpt-5",
      },
    });

    expect(result.harness.cursor).toEqual({
      model: "gpt-5",
      mode: CLI_AGENT_MODE.PLAN,
      force: true,
      browser: true,
    });
  });

  it("auto-selects the only configured harness when no default is provided", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      harnesses: {
        only: {
          name: "Only",
          command: "only-cli",
        },
      },
    });

    const result = await loadHarnessConfig({ projectRoot, homedir: userRoot });

    expect(result.harnessId).toBe("only");
    expect(result.harness.command).toBe("only-cli");
  });

  it("ignores whitespace-only default harness values and auto-selects single harness", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "   ",
      harnesses: {
        only: {
          name: "Only",
          command: "only-cli",
        },
      },
    });

    const result = await loadHarnessConfig({ projectRoot, homedir: userRoot });

    expect(result.harnessId).toBe("only");
    expect(result.harness.command).toBe("only-cli");
  });

  it("trims explicit CLI harness id before lookup", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "alpha",
      harnesses: {
        alpha: {
          name: "Alpha",
          command: "alpha-cli",
        },
        beta: {
          name: "Beta",
          command: "beta-cli",
        },
      },
    });

    const result = await loadHarnessConfig({
      projectRoot,
      homedir: userRoot,
      harnessId: " beta ",
    });

    expect(result.harnessId).toBe("beta");
    expect(result.harness.command).toBe("beta-cli");
  });

  it("rejects explicit CLI harness id when value is whitespace-only", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "alpha",
      harnesses: {
        alpha: {
          name: "Alpha",
          command: "alpha-cli",
        },
      },
    });

    await expect(
      loadHarnessConfig({
        projectRoot,
        homedir: userRoot,
        harnessId: "   ",
      })
    ).rejects.toThrow(formatInvalidHarnessIdError("   "));
  });

  it("throws when multiple harnesses exist and no default is configured", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      harnesses: {
        alpha: {
          name: "Alpha",
          command: "alpha",
        },
        beta: {
          name: "Beta",
          command: "beta",
        },
      },
    });

    await expect(loadHarnessConfig({ projectRoot, homedir: userRoot })).rejects.toThrow(
      HARNESS_CONFIG_ERROR.NO_DEFAULT_HARNESS_CONFIGURED
    );
  });

  it("throws harness-not-found for unknown explicit harness id", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "alpha",
      harnesses: {
        alpha: {
          name: "Alpha",
          command: "alpha",
        },
      },
    });

    await expect(
      loadHarnessConfig({
        projectRoot,
        homedir: userRoot,
        harnessId: "missing",
      })
    ).rejects.toThrow(formatHarnessNotFoundError("missing"));
  });

  it("throws when harness id contains surrounding whitespace", async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "toadstool-project-"));
    userRoot = await mkdtemp(path.join(tmpdir(), "toadstool-user-"));

    await writeHarnessFile(projectRoot, {
      defaultHarness: "alpha",
      harnesses: {
        " alpha ": {
          name: "Alpha",
          command: "alpha",
        },
      },
    });

    await expect(loadHarnessConfig({ projectRoot, homedir: userRoot })).rejects.toThrow(
      formatInvalidHarnessIdError(" alpha ")
    );
  });
});
