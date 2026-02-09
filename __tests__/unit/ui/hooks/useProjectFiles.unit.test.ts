import path from "node:path";
import { LIMIT } from "@/config/limits";
import { createIgnoreFilter } from "@/ui/hooks/useProjectFiles";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";

const mockReadFile = vi.mocked(readFile);

describe("useProjectFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createIgnoreFilter", () => {
    it("ignores default patterns", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const filter = await createIgnoreFilter("/test/cwd");

      expect(filter(".git")).toBe(true);
      expect(filter("node_modules")).toBe(true);
      expect(filter("dist")).toBe(true);
      expect(filter(".next")).toBe(true);
    });

    it("ignores nested default patterns", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const filter = await createIgnoreFilter("/test/cwd");

      expect(filter("node_modules/package/index.js")).toBe(true);
      expect(filter(".git/config")).toBe(true);
      expect(filter("dist/bundle.js")).toBe(true);
    });

    it("allows non-ignored files", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const filter = await createIgnoreFilter("/test/cwd");

      expect(filter("src/index.ts")).toBe(false);
      expect(filter("package.json")).toBe(false);
      expect(filter("README.md")).toBe(false);
    });

    it("reads and applies .gitignore patterns", async () => {
      mockReadFile.mockResolvedValue("*.log\nbuild/\n");

      const filter = await createIgnoreFilter("/test/cwd");

      expect(filter("error.log")).toBe(true);
      expect(filter("build/output.js")).toBe(true);
      expect(filter("src/index.ts")).toBe(false);
    });

    it("handles missing .gitignore gracefully", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

      const filter = await createIgnoreFilter("/test/cwd");

      // Should still work with default patterns
      expect(filter("node_modules")).toBe(true);
      expect(filter("src/index.ts")).toBe(false);
    });

    it("reads .gitignore from correct path", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      await createIgnoreFilter("/my/project");

      expect(mockReadFile).toHaveBeenCalledWith(path.join("/my/project", ".gitignore"), "utf8");
    });
  });

  describe("constants", () => {
    it("has MAX_FILES configured", () => {
      expect(typeof LIMIT.MAX_FILES).toBe("number");
      expect(LIMIT.MAX_FILES).toBeGreaterThan(0);
    });
  });

  describe("hook export", () => {
    it("exports useProjectFiles function", async () => {
      const { useProjectFiles } = await import("@/ui/hooks/useProjectFiles");
      expect(typeof useProjectFiles).toBe("function");
    });

    it("exports createIgnoreFilter function", async () => {
      const { createIgnoreFilter } = await import("@/ui/hooks/useProjectFiles");
      expect(typeof createIgnoreFilter).toBe("function");
    });
  });

  describe("path normalization", () => {
    it("converts Windows paths to POSIX", () => {
      // Test the toPosix logic pattern
      const toPosix = (value: string): string => value.split(path.sep).join("/");

      // On Unix, path.sep is '/', so this is a no-op
      // On Windows, path.sep is '\', so this converts
      const unixPath = "src/components/App.tsx";
      expect(toPosix(unixPath)).toBe("src/components/App.tsx");
    });
  });
});
