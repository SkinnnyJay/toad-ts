import { getShellCommandConfig, parseShellCommandInput } from "@/tools/shell-command-config";
import { Env, EnvManager } from "@/utils/env/env.utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("shell command config", () => {
  const originalCommands = process.env.TOADSTOOL_SHELL_COMMANDS;
  const originalAutoDetect = process.env.TOADSTOOL_SHELL_AUTO_DETECT;

  beforeEach(() => {
    EnvManager.resetInstance();
    process.env.TOADSTOOL_SHELL_COMMANDS = undefined;
    process.env.TOADSTOOL_SHELL_AUTO_DETECT = undefined;
  });

  afterEach(() => {
    if (originalCommands !== undefined) {
      process.env.TOADSTOOL_SHELL_COMMANDS = originalCommands;
    } else {
      process.env.TOADSTOOL_SHELL_COMMANDS = undefined;
    }
    if (originalAutoDetect !== undefined) {
      process.env.TOADSTOOL_SHELL_AUTO_DETECT = originalAutoDetect;
    } else {
      process.env.TOADSTOOL_SHELL_AUTO_DETECT = undefined;
    }
    EnvManager.resetInstance();
  });

  it("parses explicit shell commands", () => {
    const env = new Env(EnvManager.getInstance());
    const config = getShellCommandConfig(env);
    const match = parseShellCommandInput("!ls -la", config);
    expect(match).not.toBeNull();
    if (!match) return;
    expect(match.command).toBe("ls -la");
    expect(match.explicit).toBe(true);
    expect(match.interactive).toBe(false);
  });

  it("detects background shell commands", () => {
    const env = new Env(EnvManager.getInstance());
    const config = getShellCommandConfig(env);
    const match = parseShellCommandInput("!git status &", config);
    expect(match).not.toBeNull();
    if (!match) return;
    expect(match.command).toBe("git status");
    expect(match.background).toBe(true);
    expect(match.interactive).toBe(false);
  });

  it("auto-detects configured commands", () => {
    process.env.TOADSTOOL_SHELL_COMMANDS = "git,ls";
    const env = new Env(EnvManager.getInstance());
    const config = getShellCommandConfig(env);
    const match = parseShellCommandInput("git status", config);
    expect(match).not.toBeNull();
    if (!match) return;
    expect(match.command).toBe("git status");
    expect(match.explicit).toBe(false);
    expect(match.interactive).toBe(false);
  });

  it("respects auto-detect toggle", () => {
    process.env.TOADSTOOL_SHELL_AUTO_DETECT = "false";
    const env = new Env(EnvManager.getInstance());
    const config = getShellCommandConfig(env);
    const match = parseShellCommandInput("git status", config);
    expect(match).toBeNull();
  });

  it("ignores slash commands", () => {
    const env = new Env(EnvManager.getInstance());
    const config = getShellCommandConfig(env);
    const match = parseShellCommandInput("/help", config);
    expect(match).toBeNull();
  });

  it("marks interactive commands", () => {
    const env = new Env(EnvManager.getInstance());
    const config = getShellCommandConfig(env);
    const match = parseShellCommandInput("!vim README.md", config);
    expect(match).not.toBeNull();
    if (!match) return;
    expect(match.interactive).toBe(true);
  });
});
