import { supportsInlineImages } from "@/core/image-renderer";
import { EnvManager } from "@/utils/env/env.utils";
import { afterEach, describe, expect, it } from "vitest";

describe("image-renderer supportsInlineImages", () => {
  const originalTermProgram = process.env.TERM_PROGRAM;
  const originalTerm = process.env.TERM;
  const originalKittyPid = process.env.KITTY_PID;

  afterEach(() => {
    process.env.TERM_PROGRAM = originalTermProgram;
    process.env.TERM = originalTerm;
    process.env.KITTY_PID = originalKittyPid;
    EnvManager.resetInstance();
  });

  it("returns true for iTerm terminal program", () => {
    process.env.TERM_PROGRAM = "iTerm.app";
    process.env.TERM = "";
    process.env.KITTY_PID = "";
    EnvManager.resetInstance();

    expect(supportsInlineImages()).toBe(true);
  });

  it("returns true for kitty terminals", () => {
    process.env.TERM_PROGRAM = "";
    process.env.TERM = "xterm-kitty";
    process.env.KITTY_PID = "1234";
    EnvManager.resetInstance();

    expect(supportsInlineImages()).toBe(true);
  });

  it("returns false for unsupported terminals", () => {
    process.env.TERM_PROGRAM = "";
    process.env.TERM = "xterm-256color";
    process.env.KITTY_PID = "";
    EnvManager.resetInstance();

    expect(supportsInlineImages()).toBe(false);
  });
});
