import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Command } from "commander";
import { createElement } from "react";

import { PERFORMANCE_MARK } from "@/constants/performance-marks";
import { HOST_FLAG, PORT_FLAG, SERVER_FLAG, SETUP_FLAG } from "@/constants/server-cli";
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
  .option(`${HOST_FLAG} <host>`, "Server host (with --server)");

program.parse();

const opts = program.opts<{
  setup?: boolean;
  server?: boolean;
  port?: string;
  host?: string;
}>();

if (opts.setup) {
  const result = await writeTerminalSetupScript();
  process.stdout.write(`Wrote terminal setup script to ${result.scriptPath}\n`);
  process.stdout.write(`Run: source ${result.scriptPath}\n`);
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
