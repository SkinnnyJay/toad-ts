import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAppConfig } from "@/config/app-config";
import { CONFIG_FILE } from "@/constants/config-files";
import { ENV_KEY } from "@/constants/env-keys";
import { HOOK_EVENT } from "@/constants/hook-events";
import { HOOK_TYPE } from "@/constants/hook-types";
import { describe, expect, it } from "vitest";

const createTempDir = async (prefix: string): Promise<string> => {
  return mkdtemp(join(tmpdir(), prefix));
};

describe("app-config", () => {
  it("merges project config over global config", async () => {
    const homeDir = await createTempDir("toadstool-config-home-");
    const projectDir = await createTempDir("toadstool-config-project-");
    const globalDir = join(homeDir, CONFIG_FILE.GLOBAL_CONFIG_DIR, CONFIG_FILE.GLOBAL_APP_DIR);
    await mkdir(globalDir, { recursive: true });
    await writeFile(
      join(globalDir, CONFIG_FILE.GLOBAL_CONFIG_FILE),
      JSON.stringify({
        defaults: { agent: "global-agent" },
        keybinds: { leader: "ctrl+g" },
      }),
      "utf8"
    );
    await writeFile(
      join(projectDir, CONFIG_FILE.PROJECT_JSON),
      JSON.stringify({ defaults: { agent: "project-agent" } }),
      "utf8"
    );

    const env: NodeJS.ProcessEnv = {};
    const config = await loadAppConfig({ cwd: projectDir, homeDir, env });

    expect(config.defaults?.agent).toBe("project-agent");
    expect(config.keybinds.leader).toBe("ctrl+g");
  });

  it("prefers env config content overrides", async () => {
    const homeDir = await createTempDir("toadstool-config-home-");
    const projectDir = await createTempDir("toadstool-config-project-");
    const env: NodeJS.ProcessEnv = {
      [ENV_KEY.TOADSTOOL_CONFIG_CONTENT]: JSON.stringify({
        keybinds: { leader: "ctrl+e" },
      }),
    };

    const config = await loadAppConfig({ cwd: projectDir, homeDir, env });

    expect(config.keybinds.leader).toBe("ctrl+e");
  });

  it("defaults vim to disabled", async () => {
    const homeDir = await createTempDir("toadstool-config-home-");
    const projectDir = await createTempDir("toadstool-config-project-");
    const env: NodeJS.ProcessEnv = {};

    const config = await loadAppConfig({ cwd: projectDir, homeDir, env });

    expect(config.vim.enabled).toBe(false);
  });

  it("defaults routing rules to empty list", async () => {
    const homeDir = await createTempDir("toadstool-config-home-");
    const projectDir = await createTempDir("toadstool-config-project-");
    const env: NodeJS.ProcessEnv = {};

    const config = await loadAppConfig({ cwd: projectDir, homeDir, env });

    expect(config.routing.rules).toEqual([]);
  });

  it("merges routing rules across config layers", async () => {
    const homeDir = await createTempDir("toadstool-config-home-");
    const projectDir = await createTempDir("toadstool-config-project-");
    const globalDir = join(homeDir, CONFIG_FILE.GLOBAL_CONFIG_DIR, CONFIG_FILE.GLOBAL_APP_DIR);
    await mkdir(globalDir, { recursive: true });
    await writeFile(
      join(globalDir, CONFIG_FILE.GLOBAL_CONFIG_FILE),
      JSON.stringify({
        routing: {
          rules: [{ matcher: "lint", agentId: "mock" }],
        },
      }),
      "utf8"
    );
    await writeFile(
      join(projectDir, CONFIG_FILE.PROJECT_JSON),
      JSON.stringify({
        routing: {
          rules: [{ matcher: "build", agentId: "mock:build" }],
        },
      }),
      "utf8"
    );

    const config = await loadAppConfig({ cwd: projectDir, homeDir, env: {} });

    expect(config.routing.rules).toEqual([
      { matcher: "lint", agentId: "mock" },
      { matcher: "build", agentId: "mock:build" },
    ]);
  });

  it("merges hooks across config layers", async () => {
    const homeDir = await createTempDir("toadstool-config-home-");
    const projectDir = await createTempDir("toadstool-config-project-");
    const globalDir = join(homeDir, CONFIG_FILE.GLOBAL_CONFIG_DIR, CONFIG_FILE.GLOBAL_APP_DIR);
    await mkdir(globalDir, { recursive: true });
    await writeFile(
      join(globalDir, CONFIG_FILE.GLOBAL_CONFIG_FILE),
      JSON.stringify({
        hooks: {
          [HOOK_EVENT.SESSION_START]: [
            {
              hooks: [{ type: HOOK_TYPE.COMMAND, command: "echo global" }],
            },
          ],
        },
      }),
      "utf8"
    );
    await writeFile(
      join(projectDir, CONFIG_FILE.PROJECT_JSON),
      JSON.stringify({
        hooks: {
          [HOOK_EVENT.PRE_TOOL_USE]: [
            {
              matcher: "exec_bash",
              hooks: [{ type: HOOK_TYPE.COMMAND, command: "echo project" }],
            },
          ],
        },
      }),
      "utf8"
    );

    const env: NodeJS.ProcessEnv = {};
    const config = await loadAppConfig({ cwd: projectDir, homeDir, env });

    expect(config.hooks[HOOK_EVENT.SESSION_START]).toHaveLength(1);
    expect(config.hooks[HOOK_EVENT.PRE_TOOL_USE]).toHaveLength(1);
  });

  it("resolves env and file variables", async () => {
    const homeDir = await createTempDir("toadstool-config-home-");
    const projectDir = await createTempDir("toadstool-config-project-");
    const filePath = join(projectDir, "leader.txt");
    await writeFile(filePath, "ctrl+y", "utf8");
    const env: NodeJS.ProcessEnv = {
      DEFAULT_AGENT: "config-agent",
      [ENV_KEY.TOADSTOOL_CONFIG_CONTENT]: JSON.stringify({
        defaults: { agent: "{env:DEFAULT_AGENT}" },
        keybinds: { leader: "{file:leader.txt}" },
      }),
    };

    const config = await loadAppConfig({ cwd: projectDir, homeDir, env });

    expect(config.defaults?.agent).toBe("config-agent");
    expect(config.keybinds.leader).toBe("ctrl+y");
  });
});
