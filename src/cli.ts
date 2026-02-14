import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Command } from "commander";
import { createElement } from "react";

import { SERVER_CONFIG } from "@/config/server";
import { TERMINAL_TITLE } from "@/constants/app-branding";
import { PERFORMANCE_MARK } from "@/constants/performance-marks";
import { CLAUDE_SONNET_4_5 } from "@/constants/provider-models";
import { HOST_FLAG, PORT_FLAG, SERVER_FLAG, SETUP_FLAG } from "@/constants/server-cli";
import { createDefaultProviderRegistry } from "@/core/providers/provider-registry";
import { startHeadlessServer } from "@/server/headless-server";
import { resolveServerConfig } from "@/server/server-config";
import { App } from "@/ui/components/App";
import { EnvManager } from "@/utils/env/env.utils";
import { writeTerminalSetupScript } from "@/utils/terminal-setup";
import { scheduleUpdateCheck } from "@/utils/update-check";

EnvManager.bootstrap();

performance.mark(PERFORMANCE_MARK.STARTUP_START);

const AGENT_EXAMPLE_MODEL = CLAUDE_SONNET_4_5;

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
  .option("--allowedTools <tools>", "Comma-separated allowed tools for auto-approval")
  .option("--json-schema <schema>", "JSON schema for validated responses")
  .option("--append-system-prompt <prompt>", "Append to system prompt")
  .option("--fallback-model <model>", "Fallback model for overloaded servers")
  .option("--from-pr <pr>", "Resume session linked to a PR number");

// Default subcommand: start interactive TUI when no command is given
program
  .command("start", { isDefault: true })
  .description("Start the interactive TUI (default)")
  .action(async () => {
    scheduleUpdateCheck();
    try {
      process.title = TERMINAL_TITLE;
      if (process.stdout.isTTY) {
        process.stdout.write(`\x1b]0;${TERMINAL_TITLE}\x07`);
      }
      const renderer = await createCliRenderer({
        exitOnCtrlC: true,
      });
      createRoot(renderer).render(createElement(App));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/raw mode|stdin|isRawModeSupported|TTY|terminal.*support/i.test(msg)) {
        process.stderr.write(
          "Error: This app needs an interactive terminal (raw TTY). Run `bun run dev` or `bun run start` from a real terminal, not from an IDE run panel or a non-interactive shell.\n"
        );
        process.exit(1);
      }
      throw err;
    }
  });

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

// Subcommand: agent create
program
  .command("agent <action>")
  .description("Agent management (create)")
  .action((action: string) => {
    if (action === "create") {
      process.stdout.write("Agent creation wizard:\n");
      process.stdout.write("- Create a .md file in .toadstool/agents/\n");
      process.stdout.write("- Add YAML frontmatter with name, description, model, tools\n");
      process.stdout.write("- Add markdown body with agent instructions\n");
      process.stdout.write("\nExample:\n");
      process.stdout.write(
        `---\nname: reviewer\ndescription: Code reviewer\nmodel: ${AGENT_EXAMPLE_MODEL}\n---\n\nReview all code changes.\n`
      );
    } else {
      process.stderr.write(`Unknown agent action: ${action}\n`);
    }
  });

// Subcommand: mcp
program
  .command("mcp [action]")
  .description("MCP server management (list, add, remove)")
  .action((action?: string) => {
    if (!action || action === "list") {
      process.stdout.write(
        "MCP servers are configured in .toadstool/mcp.json or .cursor/mcp.json\n"
      );
    } else {
      process.stdout.write(`MCP action '${action}' — edit your mcp.json configuration file.\n`);
    }
  });

// Subcommand: attach
program
  .command("attach [url]")
  .description("Attach to a running TOADSTOOL server")
  .option("--port <port>", "Server port")
  .action((url?: string, subOpts?: { port?: string }) => {
    const target =
      url ??
      `http://${SERVER_CONFIG.DEFAULT_HOST}:${subOpts?.port ?? String(SERVER_CONFIG.DEFAULT_PORT)}`;
    process.stdout.write(`Connecting to ${target}...\n`);
    process.stdout.write("Use 'toadstool serve' on the remote machine first.\n");
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
  jsonSchema?: string;
  appendSystemPrompt?: string;
  fallbackModel?: string;
  fromPr?: string;
}>();

// Detect piped stdin (e.g., cat file | toadstool -p "query")
const hasPipedInput = !process.stdin.isTTY;

// Only run TUI/server/setup if no subcommand was handled
const subcommandUsed =
  program.args.length > 0 && program.commands.some((cmd) => cmd.name() === program.args[0]);
if (!subcommandUsed) {
  if (opts.setup) {
    const result = await writeTerminalSetupScript();
    process.stdout.write(`Wrote terminal setup script to ${result.scriptPath}\n`);
    process.stdout.write(`Run: source ${result.scriptPath}\n`);
  } else if (opts.prompt) {
    // Read piped stdin if available
    let stdinContent = "";
    if (hasPipedInput) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      stdinContent = Buffer.concat(chunks).toString("utf8");
    }

    const fullPrompt = stdinContent ? `${stdinContent}\n\n${opts.prompt}` : opts.prompt;

    // Headless prompt mode
    process.stdout.write(
      `${JSON.stringify({
        mode: "headless",
        prompt: fullPrompt,
        model: opts.model,
        outputFormat: opts.outputFormat ?? "text",
        maxTurns: opts.maxTurns ? Number.parseInt(opts.maxTurns, 10) : undefined,
        maxBudgetUsd: opts.maxBudgetUsd ? Number.parseFloat(opts.maxBudgetUsd) : undefined,
        jsonSchema: opts.jsonSchema,
        appendSystemPrompt: opts.appendSystemPrompt,
        fallbackModel: opts.fallbackModel,
        fromPr: opts.fromPr,
        allowedTools: opts.allowedTools?.split(",").map((t) => t.trim()),
        hasPipedInput,
      })}\n`
    );
    process.stdout.write("Headless mode: prompt queued for execution.\n");
  } else {
    scheduleUpdateCheck();
    if (opts.server) {
      const config = resolveServerConfig({
        host: opts.host,
        port: opts.port !== undefined ? Number.parseInt(opts.port, 10) : undefined,
      });
      await startHeadlessServer(config);
    } else {
      try {
        const renderer = await createCliRenderer({
          exitOnCtrlC: true,
        });
        createRoot(renderer).render(createElement(App));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/raw mode|stdin|isRawModeSupported|TTY|terminal.*support/i.test(msg)) {
          process.stderr.write(
            "Error: This app needs an interactive terminal (raw TTY). Run from a real terminal, not from an IDE run panel or a non-interactive shell.\n"
          );
          process.exit(1);
        }
        throw err;
      }
    }
  }
}
