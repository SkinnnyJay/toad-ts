import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURSOR_HOOK_EVENT } from "../../../src/constants/cursor-hook-events";
import { ENCODING } from "../../../src/constants/encodings";
import { ENV_KEY } from "../../../src/constants/env-keys";
import {
  CURSOR_HOOK_INSTALL_SCOPE,
  cleanupCursorHooks,
  generateCursorHooksConfig,
  injectHookSocketEnv,
  installCursorHooks,
  mergeCursorHooksConfig,
  resolveCursorHookInstallPaths,
} from "../../../src/core/cursor/hooks-config-generator";

describe("hooks-config-generator", () => {
  it("resolves install paths for project and user scopes", async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), "toadstool-hooks-paths-"));
    const projectPaths = resolveCursorHookInstallPaths(CURSOR_HOOK_INSTALL_SCOPE.PROJECT, {
      cwd: baseDir,
    });
    const userPaths = resolveCursorHookInstallPaths(CURSOR_HOOK_INSTALL_SCOPE.USER, {
      homeDir: baseDir,
    });

    expect(projectPaths.hooksFilePath).toBe(path.join(baseDir, ".cursor", "hooks.json"));
    expect(projectPaths.nodeShimPath.endsWith(".toadstool/hooks/toadstool-hook.mjs")).toBe(true);
    expect(userPaths.hooksFilePath).toBe(path.join(baseDir, ".cursor", "hooks.json"));
  });

  it("generates hooks config with expected event coverage", () => {
    const config = generateCursorHooksConfig({
      command: "/tmp/toadstool-hook.mjs",
      enabledEvents: [CURSOR_HOOK_EVENT.SESSION_START, CURSOR_HOOK_EVENT.PRE_TOOL_USE],
    });

    expect(config.version).toBe(1);
    expect(config.hooks.sessionStart).toEqual([
      { command: "/tmp/toadstool-hook.mjs", timeout: 10 },
    ]);
    expect(config.hooks.preToolUse).toEqual([{ command: "/tmp/toadstool-hook.mjs", timeout: 30 }]);
  });

  it("merges generated hooks with existing hooks without duplicates", () => {
    const existing = {
      version: 1,
      hooks: {
        sessionStart: [{ command: "custom-hook" }],
        preToolUse: [{ command: "toadstool-hook", timeout: 30 }],
      },
    };
    const generated = {
      version: 1,
      hooks: {
        sessionStart: [{ command: "toadstool-hook", timeout: 10 }],
        preToolUse: [{ command: "toadstool-hook", timeout: 30 }],
      },
    };

    const merged = mergeCursorHooksConfig(existing, generated);

    expect(merged.hooks.sessionStart).toEqual([
      { command: "custom-hook" },
      { command: "toadstool-hook", timeout: 10 },
    ]);
    expect(merged.hooks.preToolUse).toEqual([{ command: "toadstool-hook", timeout: 30 }]);
  });

  it("installs hooks, writes shim scripts, and restores existing hooks on cleanup", async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), "toadstool-hooks-install-"));
    const existingHooksPath = path.join(baseDir, ".cursor", "hooks.json");
    const existingHooksContent = JSON.stringify(
      {
        version: 1,
        hooks: {
          sessionStart: [{ command: "custom-hook" }],
        },
      },
      null,
      2
    );

    await mkdir(path.dirname(existingHooksPath), { recursive: true });
    await writeFile(existingHooksPath, existingHooksContent, ENCODING.UTF8);

    const installation = await installCursorHooks({
      cwd: baseDir,
      scope: CURSOR_HOOK_INSTALL_SCOPE.PROJECT,
      socketTarget: "/tmp/toadstool-hooks.sock",
    });

    const installedHooksRaw = await readFile(existingHooksPath, ENCODING.UTF8);
    const installedHooks = JSON.parse(installedHooksRaw) as {
      hooks: Record<string, Array<{ command: string }>>;
    };
    expect(installedHooks.hooks.sessionStart?.length).toBe(2);
    expect(
      installedHooks.hooks.sessionStart?.some((entry) => entry.command === "custom-hook")
    ).toBe(true);

    const nodeShimRaw = await readFile(installation.paths.nodeShimPath, ENCODING.UTF8);
    const bashShimRaw = await readFile(installation.paths.bashShimPath, ENCODING.UTF8);
    expect(nodeShimRaw).toContain(ENV_KEY.TOADSTOOL_HOOK_SOCKET);
    expect(bashShimRaw).toContain(ENV_KEY.TOADSTOOL_HOOK_SOCKET);

    await cleanupCursorHooks(installation);

    const restoredHooksRaw = await readFile(existingHooksPath, ENCODING.UTF8);
    expect(restoredHooksRaw).toBe(existingHooksContent);
  });

  it("removes generated hooks file when no previous hooks existed", async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), "toadstool-hooks-cleanup-"));
    const hooksPath = path.join(baseDir, ".cursor", "hooks.json");

    const installation = await installCursorHooks({
      cwd: baseDir,
      scope: CURSOR_HOOK_INSTALL_SCOPE.PROJECT,
      socketTarget: "http://127.0.0.1:2345/hook",
      useBashShim: true,
      enabledEvents: [CURSOR_HOOK_EVENT.STOP],
    });

    await cleanupCursorHooks(installation);

    await expect(readFile(hooksPath, ENCODING.UTF8)).rejects.toThrow();
    await expect(readFile(installation.paths.nodeShimPath, ENCODING.UTF8)).rejects.toThrow();
    await expect(readFile(installation.paths.bashShimPath, ENCODING.UTF8)).rejects.toThrow();
  });

  it("injects hook socket env variable", () => {
    const env = injectHookSocketEnv({ PATH: "/usr/bin" }, "/tmp/test-hook.sock");
    expect(env[ENV_KEY.TOADSTOOL_HOOK_SOCKET]).toBe("/tmp/test-hook.sock");
    expect(env.PATH).toBe("/usr/bin");
  });
});
