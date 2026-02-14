import { describe, expect, it } from "vitest";

import { TerminalHandler } from "../../../src/core/terminal-handler";

describe("TerminalHandler", () => {
  it("captures stdout", async () => {
    const handler = new TerminalHandler({ allowEscape: true });
    const result = await handler.exec(process.execPath, ["-e", "process.stdout.write('ok')"]);
    expect(result.stdout).toBe("ok");
    expect(result.stderr).toBe("");
    expect(result.exitCode).toBe(0);
  });

  it("captures stderr and non-zero exit", async () => {
    const handler = new TerminalHandler({ allowEscape: true });
    const result = await handler.exec(process.execPath, [
      "-e",
      "process.stderr.write('err'); process.exit(3)",
    ]);
    expect(result.stderr).toContain("err");
    expect(result.exitCode).toBe(3);
  });

  it("honors timeout", async () => {
    const handler = new TerminalHandler({ allowEscape: true });
    const result = await handler.exec(process.execPath, ["-e", "setTimeout(()=>{}, 2000)"], {
      timeoutMs: 200,
    });
    expect(result.exitCode).not.toBe(0);
  });

  it("rejects path escape when not allowed", async () => {
    const handler = new TerminalHandler({ defaultCwd: "/tmp" });
    await expect(handler.exec("../evil", [])).rejects.toThrow("path escape");
  });

  it("rejects windows-style path escape when not allowed", async () => {
    const handler = new TerminalHandler({ defaultCwd: "/tmp" });
    await expect(handler.exec("..\\evil", [])).rejects.toThrow("path escape");
  });

  it("rejects mixed-separator path escape arguments when not allowed", async () => {
    const handler = new TerminalHandler({ defaultCwd: "/tmp" });
    await expect(handler.exec(process.execPath, ["..\\nested/../evil"])).rejects.toThrow(
      "path escape"
    );
  });

  it("allows escape when opted in", async () => {
    const handler = new TerminalHandler({ defaultCwd: "/tmp", allowEscape: true });
    const result = await handler.exec(process.execPath, ["-e", "process.stdout.write('ok')"], {
      cwd: "/",
    });
    expect(result.stdout).toBe("ok");
  });

  it("rejects sibling absolute cwd that only shares prefix with base", async () => {
    const handler = new TerminalHandler({ defaultCwd: "/tmp/base" });
    await expect(
      handler.exec(process.execPath, ["-e", "process.stdout.write('ok')"], {
        cwd: "/tmp/base-sibling",
      })
    ).rejects.toThrow("Cwd escapes base directory");
  });
});
