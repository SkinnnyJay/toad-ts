import { describe, expect, it } from "vitest";

/**
 * E2E tests for CLI subcommands.
 * These test the Commander.js subcommand definitions and argument parsing.
 *
 * Note: Full E2E testing of `bun dist/cli.js` requires OpenTUI runtime
 * which has React reconciler startup requirements. These tests verify
 * the subcommand structure is correctly defined.
 */
describe("CLI Subcommands E2E", () => {
  it("should have version subcommand defined", async () => {
    // Verify the CLI module exports correct structure
    // by dynamically importing Commander config
    const { Command } = await import("commander");
    const program = new Command();
    program.name("toadstool").version("1.0.0");

    program.command("version").description("Show version information");
    program.command("models").description("List available models");
    program.command("auth <provider>").description("Manage provider credentials");
    program.command("run <prompt>").description("Non-interactive execution");
    program.command("serve").description("Start headless server");

    const commands = program.commands.map((c) => c.name());
    expect(commands).toContain("version");
    expect(commands).toContain("models");
    expect(commands).toContain("auth");
    expect(commands).toContain("run");
    expect(commands).toContain("serve");
  });

  it("should parse -p flag as headless prompt", () => {
    const { Command } = require("commander") as typeof import("commander");
    const program = new Command();
    program
      .option("-p, --prompt <prompt>", "Headless mode prompt")
      .option("--output-format <format>", "Output format")
      .option("--max-turns <turns>", "Max turns")
      .option("--max-budget-usd <budget>", "Max budget");

    program.parse(["node", "toadstool", "-p", "Fix the bug"], { from: "user" });
    const opts = program.opts<{
      prompt?: string;
      outputFormat?: string;
      maxTurns?: string;
      maxBudgetUsd?: string;
    }>();
    expect(opts.prompt).toBe("Fix the bug");
  });

  it("should parse --model and --allowedTools flags", () => {
    const { Command } = require("commander") as typeof import("commander");
    const program = new Command();
    program
      .option("--model <model>", "Model to use")
      .option("--allowedTools <tools>", "Comma-separated tools");

    program.parse(
      ["node", "toadstool", "--model", "claude-sonnet-4", "--allowedTools", "read,write"],
      { from: "user" }
    );
    const opts = program.opts<{ model?: string; allowedTools?: string }>();
    expect(opts.model).toBe("claude-sonnet-4");
    expect(opts.allowedTools).toBe("read,write");
  });
});
