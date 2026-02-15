import { PLATFORM } from "@/constants/platform";
import { EnvManager } from "@/utils/env/env.utils";
import {
  createShellCommandInvocation,
  createShellSessionInvocation,
} from "@/utils/shell-invocation.utils";
import { afterEach, describe, expect, it } from "vitest";

const ORIGINAL_SHELL = process.env.SHELL;

afterEach(() => {
  if (ORIGINAL_SHELL === undefined) {
    process.env.SHELL = undefined;
  } else {
    process.env.SHELL = ORIGINAL_SHELL;
  }
  EnvManager.resetInstance();
});

describe("shell invocation utility", () => {
  it("creates posix one-shot invocation from runtime shell env snapshot", () => {
    process.env.SHELL = "/usr/bin/fish";
    EnvManager.resetInstance();

    const invocation = createShellCommandInvocation("echo hi", PLATFORM.LINUX);

    expect(invocation.command).toBe("/usr/bin/fish");
    expect(invocation.args).toEqual(["-lc", "echo hi"]);
    expect(invocation.envSnapshot.SHELL).toBe("/usr/bin/fish");
  });

  it("creates windows one-shot invocation with cmd wrapper args", () => {
    const invocation = createShellCommandInvocation("dir C:\\Temp", PLATFORM.WIN32);

    expect(invocation.command).toBe("cmd.exe");
    expect(invocation.args).toEqual(["/D", "/Q", "/S", "/C", '"dir C:\\Temp"']);
  });

  it("creates shell-session invocation with windows interactive args", () => {
    const invocation = createShellSessionInvocation(PLATFORM.WIN32);

    expect(invocation.command).toBe("cmd.exe");
    expect(invocation.args).toEqual(["/D", "/Q", "/K"]);
    expect(invocation.usesShell).toBe(true);
    expect(invocation.isWindows).toBe(true);
  });
});
