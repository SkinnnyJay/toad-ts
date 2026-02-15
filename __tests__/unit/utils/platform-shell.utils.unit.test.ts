import { PLATFORM } from "@/constants/platform";
import {
  resolvePlatformShellCommandSpec,
  resolvePlatformShellSessionSpec,
} from "@/utils/platform-shell.utils";
import { describe, expect, it } from "vitest";

describe("platform shell command adapter", () => {
  it("resolves windows shell-session startup spec", () => {
    const spec = resolvePlatformShellSessionSpec({}, PLATFORM.WIN32);

    expect(spec).toEqual({
      command: "cmd.exe",
      args: ["/D", "/Q", "/K"],
      usesShell: true,
      isWindows: true,
    });
  });

  it("resolves posix shell-session startup spec from shell env", () => {
    const spec = resolvePlatformShellSessionSpec({ SHELL: "/usr/bin/zsh" }, PLATFORM.LINUX);

    expect(spec).toEqual({
      command: "/usr/bin/zsh",
      args: ["-s"],
      usesShell: false,
      isWindows: false,
    });
  });

  it("resolves windows one-shot command spec via cmd.exe wrapper args", () => {
    const spec = resolvePlatformShellCommandSpec('type "C:\\A&B^\\file.txt"', {}, PLATFORM.WIN32);

    expect(spec).toEqual({
      command: "cmd.exe",
      args: ["/D", "/Q", "/S", "/C", '"type ""C:\\A&B^\\file.txt"""'],
    });
  });

  it("resolves posix one-shot command spec with shell fallback", () => {
    const spec = resolvePlatformShellCommandSpec("echo hi", {}, PLATFORM.LINUX);

    expect(spec).toEqual({
      command: "bash",
      args: ["-lc", "echo hi"],
    });
  });
});
