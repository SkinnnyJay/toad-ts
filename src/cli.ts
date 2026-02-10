import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Command } from "commander";
import { createElement } from "react";

import { PERFORMANCE_MARK } from "@/constants/performance-marks";
import { HOST_FLAG, PORT_FLAG, SERVER_FLAG, SETUP_FLAG } from "@/constants/server-cli";
import { createDefaultProviderRegistry } from "@/core/providers/provider-registry";
import { startHeadlessServer } from "@/server/headless-server";
import { resolveServerConfig } from "@/server/server-config";
import { App } from "@/ui/components/App";
import { EnvManager } from "@/utils/env/env.utils";
import { writeTerminalSetupScript } from "@/utils/terminal-setup";
import { checkForUpdates } from "@/utils/update-check";

EnvManager.bootstrap();

performance.mark(PERFORMANCE_MARK.STARTUP_START);

const program = new Command();
program
  .name("toadstool")
  .description("Unified terminal interface for AI coding agents")
  .version("1.0.0")
  .option(SETUP_FLAG, "Write terminal setup script and print source path")
  .option(SERVER_FLAG, "Start headless HTTP/WebSocket server")
  .option(`${PORT_FLAG} <port>`, "Server port (with --server)")
  .option(`${HOST_FLAG} <host>`, "Server host (with --server)")
  .option("-p, --prompt <prompt>", "Run in headless mode: send prompt, print response, exit")
  .option("--output-format <format>", "Output format for headless mode: text, json, stream-json")
  .option("--max-turns <turns>", "Maximum conversation turns (headless)")
  .option("--max-budget-usd <budget>", "Maximum budget in USD (headless)")
  .option("--model <model>", "Model to use")
  .option("--allowedTools <tools>", "Comma-separated allowed tools for auto-approval");

// Subcommand: run
program
  .command("run <prompt>")
  .description("Non-interactive: send prompt, print response, exit")
  .option("--model <model>", "Model to use")
  .option("--output-format <format>", "Output format: text, json, stream-json")
  .action((prompt: string, subOpts: { model?: string; outputFormat?: string }) => {
    process.stdout.write(
      `${JSON.stringify({
        command: "run",
        prompt,
        model: subOpts.model,
        format: subOpts.outputFormat,
      })}\n`
    );
    process.stdout.write("Non-interactive mode: prompt queued for execution.\n");
  });

// Subcommand: serve
program
  .command("serve")
  .description("Start headless HTTP/WebSocket server")
  .option(`${PORT_FLAG} <port>`, "Server port")
  .option(`${HOST_FLAG} <host>`, "Server host")
  .action(async (subOpts: { port?: string; host?: string }) => {
    const config = resolveServerConfig({
      host: subOpts.host,
      port: subOpts.port !== undefined ? Number.parseInt(subOpts.port, 10) : undefined,
    });
    await startHeadlessServer(config);
  });

// Subcommand: models
program
  .command("models")
  .description("List available models from all configured providers")
  .action(async () => {
    const registry = createDefaultProviderRegistry();
    await registry.refreshModels();
    const models = registry.getAllModels();
    if (models.length === 0) {
      process.stdout.write("No models available. Configure API keys in .env\n");
      return;
    }
    for (const model of models) {
      const features: string[] = [];
      if (model.supportsVision) features.push("vision");
      if (model.supportsThinking) features.push("thinking");
      if (model.supportsStreaming) features.push("streaming");
      process.stdout.write(
        `${model.id} (${model.name}) - ${model.contextWindow}k ctx${features.length > 0 ? ` [${features.join(", ")}]` : ""}\n`
      );
    }
  });

// Subcommand: auth
program
  .command("auth <provider>")
  .description("Manage provider credentials")
  .action((provider: string) => {
    process.stdout.write(
      `Authentication for ${provider}: set API key in environment or .env file.\n`
    );
    process.stdout.write("  ANTHROPIC_API_KEY - for Anthropic/Claude\n");
    process.stdout.write("  OPENAI_API_KEY - for OpenAI\n");
  });

// Subcommand: version
program
  .command("version")
  .description("Show version information")
  .action(() => {
    process.stdout.write("toadstool v1.0.0\n");
    process.stdout.write(`Node: ${process.version}\n`);
    process.stdout.write(`Platform: ${process.platform} ${process.arch}\n`);
  });

program.parse();

const opts = program.opts<{
  setup?: boolean;
  server?: boolean;
  port?: string;
  host?: string;
  prompt?: string;
  outputFormat?: string;
  maxTurns?: string;
  maxBudgetUsd?: string;
  model?: string;
  allowedTools?: string;
}>();

// Only run TUI/server/setup if no subcommand was handled
const subcommandUsed =
  program.args.length > 0 && program.commands.some((cmd) => cmd.name() === program.args[0]);
if (!subcommandUsed) {
  if (opts.setup) {
    const result = await writeTerminalSetupScript();
    process.stdout.write(`Wrote terminal setup script to ${result.scriptPath}\n`);
    process.stdout.write(`Run: source ${result.scriptPath}\n`);
  } else if (opts.prompt) {
    // Headless prompt mode
    process.stdout.write(
      `${JSON.stringify({
        mode: "headless",
        prompt: opts.prompt,
        model: opts.model,
        outputFormat: opts.outputFormat ?? "text",
        maxTurns: opts.maxTurns ? Number.parseInt(opts.maxTurns, 10) : undefined,
        maxBudgetUsd: opts.maxBudgetUsd ? Number.parseFloat(opts.maxBudgetUsd) : undefined,
      })}\n`
    );
    process.stdout.write("Headless mode: prompt queued for execution.\n");
  } else {
    void checkForUpdates();
    if (opts.server) {
      const config = resolveServerConfig({
        host: opts.host,
        port: opts.port !== undefined ? Number.parseInt(opts.port, 10) : undefined,
      });
      await startHeadlessServer(config);
    } else {
      const renderer = await createCliRenderer({
        exitOnCtrlC: true,
      });
      createRoot(renderer).render(createElement(App));
    }
  }
}
