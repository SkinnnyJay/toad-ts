import { SIGNAL } from "@/constants/signals";
import { App } from "@/ui/components/App";
import { EnvManager } from "@/utils/env/env.utils";
import { render } from "ink";
import React from "react";

EnvManager.bootstrap();

// Set process title (shows in ps/top/Activity Monitor)
process.title = "toadstool";

// Set terminal title
process.stdout.write("\x1b]0;🍄 Toadstool\x07");

console.clear();

const { unmount } = render(React.createElement(App));

// Graceful shutdown handler
let isShuttingDown = false;
const gracefulShutdown = (): void => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // Reset terminal title
  process.stdout.write("\x1b]0;\x07");

  // Unmount React app
  unmount();

  // Exit with success code (0) for graceful shutdowns
  process.exit(0);
};

// Handle SIGINT (Ctrl+C)
process.on(SIGNAL.SIGINT, () => {
  gracefulShutdown();
});

// Handle SIGTERM (system shutdown, Docker stop, etc.)
process.on(SIGNAL.SIGTERM, () => {
  gracefulShutdown();
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught exception:", error);
  gracefulShutdown();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled rejection:", reason);
  gracefulShutdown();
  process.exit(1);
});
