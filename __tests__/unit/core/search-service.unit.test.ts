import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
});
