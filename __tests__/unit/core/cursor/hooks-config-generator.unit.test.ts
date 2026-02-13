import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { HooksConfigGenerator } from "@/core/cursor/hooks-config-generator";
import { afterEach, describe, expect, it } from "vitest";

const createTempDir = async (): Promise<string> => {
  return mkdtemp(path.join(tmpdir(), "toadstool-cursor-hooks-"));
};

describe("HooksConfigGenerator", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    while (tempDirs.length > 0) {
      const next = tempDirs.pop();
      if (next) {
        await rm(next, { recursive: true, force: true });
      }
    }
  });

  it("installs shim + hooks.json and can restore prior state", async () => {
    const projectRoot = await createTempDir();
    tempDirs.push(projectRoot);
    const generator = new HooksConfigGenerator({ projectRoot });

    const endpoint = {
      transport: "unix_socket" as const,
      socketPath: "/tmp/toadstool.sock",
    };

    const install = await generator.install(endpoint);
    const hooksRaw = await readFile(install.hooksPath, ENCODING.UTF8);
    const nodeShimRaw = await readFile(install.nodeShimPath, ENCODING.UTF8);
    const bashShimRaw = await readFile(install.bashShimPath, ENCODING.UTF8);

    expect(hooksRaw).toContain("preToolUse");
    expect(hooksRaw).toContain("toadstool-cursor-hook");
    expect(nodeShimRaw).toContain("TOADSTOOL_HOOK_SOCKET");
    expect(bashShimRaw).toContain("TOADSTOOL_HOOK_SOCKET");

    await install.restore();
    await expect(readFile(install.hooksPath, ENCODING.UTF8)).rejects.toThrow();
    await expect(readFile(install.nodeShimPath, ENCODING.UTF8)).rejects.toThrow();
    await expect(readFile(install.bashShimPath, ENCODING.UTF8)).rejects.toThrow();
  });

  it("merges with existing hooks config and preserves existing commands", async () => {
    const projectRoot = await createTempDir();
    tempDirs.push(projectRoot);
    const cursorDir = path.join(projectRoot, ".cursor");
    await mkdir(cursorDir, { recursive: true });
    const hooksPath = path.join(cursorDir, "hooks.json");
    await writeFile(
      hooksPath,
      JSON.stringify(
        {
          version: 1,
          hooks: {
            preToolUse: ["echo existing-hook"],
          },
        },
        null,
        2
      ),
      ENCODING.UTF8
    );

    const generator = new HooksConfigGenerator({ projectRoot });
    const install = await generator.install({
      transport: "http",
      url: "http://127.0.0.1:3333/",
    });
    const mergedRaw = await readFile(install.hooksPath, ENCODING.UTF8);

    expect(mergedRaw).toContain("echo existing-hook");
    expect(mergedRaw).toContain("toadstool-cursor-hook");

    await install.restore();
    const restoredRaw = await readFile(install.hooksPath, ENCODING.UTF8);
    expect(restoredRaw).toContain("echo existing-hook");
    expect(restoredRaw).not.toContain("toadstool-cursor-hook");
  });

  it("creates hook env map from endpoint", () => {
    const generator = new HooksConfigGenerator({ projectRoot: "/workspace" });
    const env = generator.createHookEnv({
      transport: "http",
      url: "http://127.0.0.1:9999/",
    });

    expect(env[ENV_KEY.TOADSTOOL_HOOK_SOCKET]).toBe("http://127.0.0.1:9999/");
  });

  it("supports installing hooks at user-level cursor directory", () => {
    const generator = new HooksConfigGenerator({
      projectRoot: "/workspace/project",
      userHomeDir: "/home/dev",
      installScope: "user",
    });

    const paths = generator.resolveInstallPaths();
    expect(paths.cursorDir).toBe("/home/dev/.cursor");
    expect(paths.hooksPath).toBe("/home/dev/.cursor/hooks.json");
  });
});
