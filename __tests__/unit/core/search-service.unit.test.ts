import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { SearchService } from "../../../src/core/search/search-service";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "search-service-"));

describe("SearchService", () => {
  it("indexes and searches text", async () => {
    const base = await createTempDir();
    await writeFile(join(base, "a.txt"), "hello world\nsecond line");
    await writeFile(join(base, "b.txt"), "another file\nhello again");

    const search = new SearchService({ baseDir: base });
    const index = await search.buildIndex();
    expect(index.some((p) => p.endsWith("a.txt"))).toBe(true);

    const results = await search.textSearch("hello", { baseDir: base });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.file.endsWith("a.txt"))).toBe(true);
  });

  it("rejects path escapes when disabled", async () => {
    const base = await createTempDir();
    const search = new SearchService({ baseDir: base });
    await expect(search.textSearch("foo", { glob: ["../**"] })).rejects.toThrow("Glob escapes");
  });

  it("bounds recursion depth for index and text search", async () => {
    const base = await createTempDir();
    await writeFile(join(base, "root.txt"), "needle root");
    await mkdir(join(base, "nested", "deeper"), { recursive: true });
    await writeFile(join(base, "nested", "deeper", "inside.txt"), "needle nested");

    const search = new SearchService({ baseDir: base });
    const shallowIndex = await search.buildIndex(["**/*"], { baseDir: base, maxDepth: 1 });
    expect(shallowIndex.some((entry) => entry.endsWith("root.txt"))).toBe(true);
    expect(shallowIndex.some((entry) => entry.includes(`${sep}nested${sep}`))).toBe(false);

    const shallowResults = await search.textSearch("needle", { baseDir: base, maxDepth: 1 });
    expect(shallowResults.some((result) => result.file.endsWith("root.txt"))).toBe(true);
    expect(shallowResults.some((result) => result.file.includes(`${sep}nested${sep}`))).toBe(false);
  });

  it("supports cancellation via abort signal", async () => {
    const base = await createTempDir();
    await writeFile(join(base, "a.txt"), "needle");
    const search = new SearchService({ baseDir: base });
    const controller = new AbortController();
    controller.abort();

    await expect(
      search.textSearch("needle", { baseDir: base, signal: controller.signal })
    ).rejects.toThrow("Search operation cancelled");
  });
});
