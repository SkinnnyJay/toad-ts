import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { describe, expect, it } from "vitest";

import { FsHandler } from "../../../src/core/fs-handler";

describe("FsHandler", () => {
  it("reads and writes within base dir", async () => {
    const base = await mkdtemp(join(tmpdir(), "fs-handler-"));
    const fsHandler = new FsHandler({ baseDir: base });
    const target = "data/test.txt";
    await fsHandler.write(target, "hello");
    const result = await fsHandler.read(target);
    expect(result).toBe("hello");
    const raw = await readFile(join(base, target), ENCODING.UTF8);
    expect(raw).toBe("hello");
  });

  it("throws on path escape", async () => {
    const base = await mkdtemp(join(tmpdir(), "fs-handler-"));
    const fsHandler = new FsHandler({ baseDir: base });
    await expect(fsHandler.read("../evil.txt")).rejects.toThrow("escapes base directory");
  });

  it("checks existence", async () => {
    const base = await mkdtemp(join(tmpdir(), "fs-handler-"));
    const fsHandler = new FsHandler({ baseDir: base });
    await fsHandler.write("exists.txt", "ok");
    expect(await fsHandler.exists("exists.txt")).toBe(true);
    expect(await fsHandler.exists("missing.txt")).toBe(false);
  });

  it("uses work subdirectory when env var is set", async () => {
    const base = await mkdtemp(join(tmpdir(), "fs-handler-"));
    const subdir = "workspace";
    const env = { [ENV_KEY.TOADSTOOL_WORK_SUBDIR]: subdir };
    const fsHandler = new FsHandler({ baseDir: base, env });
    const target = "data/test.txt";
    await fsHandler.write(target, "hello");
    const result = await fsHandler.read(target);
    expect(result).toBe("hello");
    const raw = await readFile(join(base, subdir, target), ENCODING.UTF8);
    expect(raw).toBe("hello");
  });

  it("rejects subdirectory with path traversal", () => {
    const env = { [ENV_KEY.TOADSTOOL_WORK_SUBDIR]: "../evil" };
    expect(() => {
      new FsHandler({ env });
    }).toThrow("cannot contain path traversal");
  });

  it("rejects absolute path in subdirectory", () => {
    const env = { [ENV_KEY.TOADSTOOL_WORK_SUBDIR]: "/absolute/path" };
    expect(() => {
      new FsHandler({ env });
    }).toThrow("must be a relative path");
  });

  it("defaults to current directory when env var is not set", async () => {
    const base = await mkdtemp(join(tmpdir(), "fs-handler-"));
    const fsHandler = new FsHandler({ baseDir: base });
    const target = "data/test.txt";
    await fsHandler.write(target, "hello");
    const result = await fsHandler.read(target);
    expect(result).toBe("hello");
    const raw = await readFile(join(base, target), ENCODING.UTF8);
    expect(raw).toBe("hello");
  });

  it("normalizes subdirectory with leading ./", async () => {
    const base = await mkdtemp(join(tmpdir(), "fs-handler-"));
    const subdir = "workspace";
    const env = { [ENV_KEY.TOADSTOOL_WORK_SUBDIR]: `./${subdir}` };
    const fsHandler = new FsHandler({ baseDir: base, env });
    const target = "data/test.txt";
    await fsHandler.write(target, "hello");
    const result = await fsHandler.read(target);
    expect(result).toBe("hello");
    const raw = await readFile(join(base, subdir, target), ENCODING.UTF8);
    expect(raw).toBe("hello");
  });

  it("ignores empty subdirectory env var", async () => {
    const base = await mkdtemp(join(tmpdir(), "fs-handler-"));
    const env = { [ENV_KEY.TOADSTOOL_WORK_SUBDIR]: "" };
    const fsHandler = new FsHandler({ baseDir: base, env });
    const target = "data/test.txt";
    await fsHandler.write(target, "hello");
    const result = await fsHandler.read(target);
    expect(result).toBe("hello");
    const raw = await readFile(join(base, target), ENCODING.UTF8);
    expect(raw).toBe("hello");
  });
});
