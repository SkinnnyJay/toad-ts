#!/usr/bin/env node
/**
 * TOADSTOOL Hook Shim Script
 *
 * Generic hook shim that routes all Cursor CLI hook events to the
 * TOADSTOOL IPC server via Unix domain socket.
 *
 * Cursor spawns this script for each hook event, passing JSON on stdin.
 * This script:
 * 1. Reads JSON from stdin
 * 2. Connects to the TOADSTOOL IPC server (Unix socket)
 * 3. Sends the JSON payload
 * 4. Receives the response JSON
 * 5. Writes the response to stdout
 *
 * Environment:
 *   TOADSTOOL_HOOK_SOCKET - Path to the Unix domain socket
 *
 * @see PLAN2.md — "Hook Script Template (Node.js)"
 */

import { createConnection } from "node:net";

const SOCKET_PATH = process.env.TOADSTOOL_HOOK_SOCKET;

if (!SOCKET_PATH) {
  // No socket configured — fail-open (return empty response)
  process.stdout.write("{}");
  process.exit(0);
}

const chunks = [];

process.stdin.on("data", (chunk) => {
  chunks.push(chunk);
});

process.stdin.on("end", () => {
  const input = Buffer.concat(chunks).toString();

  const client = createConnection(SOCKET_PATH, () => {
    client.write(input);
    client.end();
  });

  let response = "";

  client.on("data", (data) => {
    response += data.toString();
  });

  client.on("end", () => {
    process.stdout.write(response || "{}");
    process.exit(0);
  });

  client.on("error", () => {
    // Connection failed — fail-open for most hooks
    process.stdout.write("{}");
    process.exit(0);
  });

  // Timeout: if IPC takes too long, fail-open
  setTimeout(() => {
    if (!client.destroyed) {
      client.destroy();
    }
    process.stdout.write("{}");
    process.exit(0);
  }, 25000);
});

// Handle stdin being closed immediately (empty input)
process.stdin.on("error", () => {
  process.stdout.write("{}");
  process.exit(0);
});
