import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ALL_CURSOR_HOOK_EVENTS } from "@/constants/cursor-hook-events";
import { HooksConfigGenerator } from "@/core/cursor/hooks-config-generator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function createTempDir(): string {
  const dir = join(tmpdir(), `toadstool-hooks-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("HooksConfigGenerator", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("generateHooksJsonContent", () => {
    it("generates hooks for all events", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const content = generator.generateHooksJsonContent("/path/to/shim.mjs");

      expect(content.version).toBe(1);
      expect(Object.keys(content.hooks)).toHaveLength(ALL_CURSOR_HOOK_EVENTS.length);
    });

    it("includes timeouts for blocking hooks", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const content = generator.generateHooksJsonContent("/path/to/shim.mjs");

      // preToolUse should have a timeout
      const preToolUse = content.hooks.preToolUse;
      expect(preToolUse).toBeDefined();
      expect(preToolUse?.[0]?.timeout).toBeDefined();
      expect(preToolUse?.[0]?.timeout).toBeGreaterThan(0);
    });

    it("respects custom timeouts", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
        timeouts: { preToolUse: 99 },
      });

      const content = generator.generateHooksJsonContent("/path/to/shim.mjs");
      expect(content.hooks.preToolUse?.[0]?.timeout).toBe(99);
    });

    it("generates only enabled hooks", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
        enabledHooks: ["sessionStart", "preToolUse", "stop"],
      });

      const content = generator.generateHooksJsonContent("/path/to/shim.mjs");
      expect(Object.keys(content.hooks)).toHaveLength(3);
      expect(content.hooks.sessionStart).toBeDefined();
      expect(content.hooks.preToolUse).toBeDefined();
      expect(content.hooks.stop).toBeDefined();
    });
  });

  describe("install", () => {
    it("creates .toadstool/hooks directory and shim script", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const result = generator.install();

      expect(existsSync(result.shimPath)).toBe(true);
      expect(result.shimPath).toContain("toadstool-hook.mjs");
    });

    it("creates .cursor/hooks.json", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const result = generator.install();

      expect(existsSync(result.hooksJsonPath)).toBe(true);
      const content = JSON.parse(readFileSync(result.hooksJsonPath, "utf-8"));
      expect(content.version).toBe(1);
      expect(Object.keys(content.hooks).length).toBeGreaterThan(0);
    });

    it("returns TOADSTOOL_HOOK_SOCKET env var", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/my-socket.sock",
      });

      const result = generator.install();
      expect(result.env.TOADSTOOL_HOOK_SOCKET).toBe("/tmp/my-socket.sock");
    });

    it("shim script references in hooks.json point to installed path", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const result = generator.install();
      const content = JSON.parse(readFileSync(result.hooksJsonPath, "utf-8"));

      // All hooks should reference the installed shim path
      for (const entries of Object.values(content.hooks) as Array<Array<{ command: string }>>) {
        for (const entry of entries) {
          expect(entry.command).toContain("toadstool-hook.mjs");
        }
      }
    });
  });

  describe("merge with existing hooks.json", () => {
    it("preserves user hooks while adding TOADSTOOL hooks", () => {
      // Create existing hooks.json
      const cursorDir = join(tempDir, ".cursor");
      mkdirSync(cursorDir, { recursive: true });
      const existingHooks = {
        version: 1,
        hooks: {
          preToolUse: [{ command: "my-custom-hook.sh", timeout: 10 }],
          afterFileEdit: [{ command: "my-edit-hook.sh" }],
        },
      };
      writeFileSync(join(cursorDir, "hooks.json"), JSON.stringify(existingHooks));

      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const result = generator.install();
      const merged = JSON.parse(readFileSync(result.hooksJsonPath, "utf-8"));

      // User hook should still be present
      const preToolUseEntries = merged.hooks.preToolUse;
      expect(preToolUseEntries.length).toBe(2);
      expect(preToolUseEntries[0].command).toBe("my-custom-hook.sh");
      expect(preToolUseEntries[1].command).toContain("toadstool-hook.mjs");
    });

    it("creates backup of original hooks.json", () => {
      const cursorDir = join(tempDir, ".cursor");
      mkdirSync(cursorDir, { recursive: true });
      writeFileSync(join(cursorDir, "hooks.json"), JSON.stringify({ version: 1, hooks: {} }));

      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      generator.install();

      const backupPath = join(cursorDir, "hooks.json.toadstool-backup");
      expect(existsSync(backupPath)).toBe(true);
    });
  });

  describe("uninstall", () => {
    it("restores original hooks.json from backup", () => {
      const cursorDir = join(tempDir, ".cursor");
      mkdirSync(cursorDir, { recursive: true });
      const originalContent = JSON.stringify({
        version: 1,
        hooks: { preToolUse: [{ command: "original-hook.sh" }] },
      });
      writeFileSync(join(cursorDir, "hooks.json"), originalContent);

      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      generator.install();
      generator.uninstall();

      // Should be restored to original
      const restored = readFileSync(join(cursorDir, "hooks.json"), "utf-8");
      expect(restored).toBe(originalContent);

      // Backup should be removed
      expect(existsSync(join(cursorDir, "hooks.json.toadstool-backup"))).toBe(false);
    });

    it("removes hooks.json if we created it from scratch", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const result = generator.install();
      expect(existsSync(result.hooksJsonPath)).toBe(true);

      generator.uninstall();
      expect(existsSync(result.hooksJsonPath)).toBe(false);
    });

    it("removes shim script", () => {
      const generator = new HooksConfigGenerator({
        projectRoot: tempDir,
        socketPath: "/tmp/test.sock",
      });

      const result = generator.install();
      expect(existsSync(result.shimPath)).toBe(true);

      generator.uninstall();
      expect(existsSync(result.shimPath)).toBe(false);
    });
  });
});
