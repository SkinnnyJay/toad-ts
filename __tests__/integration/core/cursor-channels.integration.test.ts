import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURSOR_HOOK_EVENT } from "../../../src/constants/cursor-hook-events";
import { SESSION_UPDATE_TYPE } from "../../../src/constants/session-update-types";
import { CursorCliHarnessAdapter } from "../../../src/core/cursor/cursor-cli-harness";
import { CursorStreamParser } from "../../../src/core/cursor/cursor-stream-parser";
import { CursorToAcpTranslator } from "../../../src/core/cursor/cursor-to-acp-translator";
import { CursorHookIpcServer } from "../../../src/core/cursor/hook-ipc-server";
import {
  cleanupCursorHooks,
  installCursorHooks,
} from "../../../src/core/cursor/hooks-config-generator";
import { createDefaultHarnessConfig } from "../../../src/harness/defaultHarnessConfig";

const readFixture = async (fixtureName: string): Promise<string> => {
  const fixturePath = path.join(process.cwd(), "__tests__/fixtures/cursor/ndjson", fixtureName);
  return readFile(fixturePath, "utf8");
};

const invokeNodeShim = async (
  scriptPath: string,
  socketTarget: string,
  payload: Record<string, unknown>
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      env: {
        ...process.env,
        TOADSTOOL_HOOK_SOCKET: socketTarget,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Node shim exited with code ${code}: ${stderr}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
};

describe("Cursor channel integrations", () => {
  it("parses NDJSON fixture and emits translated session updates", async () => {
    const fixture = await readFixture("tool-use-response.ndjson");
    const parser = new CursorStreamParser();
    const translator = new CursorToAcpTranslator();
    const updates: string[] = [];

    translator.on("sessionUpdate", (update) => {
      updates.push(update.update.sessionUpdate);
    });

    parser.pushChunk(fixture);
    parser.end();
    const events = parser.drainEvents();
    for (const event of events) {
      translator.translate(event);
    }

    expect(events.length).toBeGreaterThan(0);
    expect(updates).toContain(SESSION_UPDATE_TYPE.AGENT_MESSAGE_CHUNK);
    expect(updates).toContain(SESSION_UPDATE_TYPE.TOOL_CALL);
    expect(updates).toContain(SESSION_UPDATE_TYPE.TOOL_CALL_UPDATE);
  });

  it("routes installed node hook shim to hook IPC server", async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), "cursor-hook-shim-integration-"));
    const hookServer = new CursorHookIpcServer({
      transport: "http",
      additionalContextProvider: () => "Injected context from TOADSTOOL",
    });

    const address = await hookServer.start();
    const socketTarget = address.url;
    if (!socketTarget) {
      throw new Error("Expected HTTP hook server URL.");
    }

    const installation = await installCursorHooks({
      cwd,
      scope: "project",
      socketTarget,
      enabledEvents: [CURSOR_HOOK_EVENT.SESSION_START],
    });

    try {
      const output = await invokeNodeShim(installation.paths.nodeShimPath, socketTarget, {
        conversation_id: "conv-1",
        generation_id: "gen-1",
        hook_event_name: CURSOR_HOOK_EVENT.SESSION_START,
        model: "opus-4.6-thinking",
        workspace_roots: [cwd],
      });
      const parsed = JSON.parse(output) as Record<string, unknown>;
      expect(parsed.continue).toBe(true);
      expect(parsed.additional_context).toBe("Injected context from TOADSTOOL");
    } finally {
      await cleanupCursorHooks(installation);
      await hookServer.stop();
    }
  });

  const isEnabled = (value: string | undefined): boolean => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
    );
  };

  const runRealCursorE2E = isEnabled(process.env.RUN_CURSOR_CLI_E2E);
  const realTest = runRealCursorE2E ? it : it.skip;

  if (!runRealCursorE2E) {
    console.warn("Skipping real cursor-cli E2E: set RUN_CURSOR_CLI_E2E=1 to enable");
  }

  realTest(
    "connects and initializes a real cursor runtime (opt-in)",
    async () => {
      const { harnesses } = createDefaultHarnessConfig(process.env);
      const cursorConfig = harnesses["cursor-cli"];
      expect(cursorConfig).toBeDefined();

      const tempCwd = await mkdtemp(path.join(tmpdir(), "cursor-runtime-e2e-"));
      const harness = new CursorCliHarnessAdapter({
        command: cursorConfig?.command,
        args: cursorConfig?.args,
        cwd: tempCwd,
        env: process.env,
      });

      try {
        await harness.connect();
        const initialized = await harness.initialize();
        expect(initialized.protocolVersion).toBeDefined();
      } finally {
        await harness.disconnect();
      }
    },
    30000
  );
});
