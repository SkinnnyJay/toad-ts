import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import { AGENT_MANAGEMENT_COMMAND } from "../../../src/constants/agent-management-commands";
import { CURSOR_CLI_COMMAND } from "../../../src/constants/cursor-cli-commands";
import { ENV_KEY } from "../../../src/constants/env-keys";
import { CursorCliConnection } from "../../../src/core/cursor/cursor-cli-connection";

const TEST_SESSION_ID = "14855632-18d5-44a3-ab27-5c93e95a8011";

describe("CursorCliConnection", () => {
  it("builds prompt args and parses streamed events", async () => {
    const capturedArgs: string[][] = [];
    const script = [
      `process.stdout.write(JSON.stringify({type:"system",subtype:"init",cwd:"/workspace",session_id:"${TEST_SESSION_ID}",model:"opus-4.6-thinking"})+"\\n");`,
      'process.stdout.write(JSON.stringify({type:"assistant",session_id:"14855632-18d5-44a3-ab27-5c93e95a8011",message:{role:"assistant",content:[{type:"text",text:"hello"}]}})+"\\n");',
      'process.stdout.write(JSON.stringify({type:"result",subtype:"success",duration_ms:2,is_error:false,result:"hello",session_id:"14855632-18d5-44a3-ab27-5c93e95a8011"})+"\\n");',
    ].join("");

    const connection = new CursorCliConnection({
      command: "cursor-agent",
      env: { [ENV_KEY.CURSOR_API_KEY]: "env-key" },
      spawnFn: (_command, args) => {
        capturedArgs.push(args);
        return spawn(process.execPath, ["-e", script], {
          stdio: ["pipe", "pipe", "pipe"],
        });
      },
    });

    const result = await connection.spawnPrompt({
      prompt: "say hi",
      sessionId: TEST_SESSION_ID,
      model: "opus-4.6-thinking",
      mode: "plan",
      force: true,
      streamPartialOutput: true,
    });

    const args = capturedArgs[0] ?? [];
    expect(args).toContain("-p");
    expect(args).toContain("--stream-partial-output");
    expect(args).toContain("--resume");
    expect(args).toContain(TEST_SESSION_ID);
    expect(args).toContain("--model");
    expect(args).toContain("opus-4.6-thinking");
    expect(args).toContain("--mode");
    expect(args).toContain("plan");
    expect(args).toContain("--force");
    expect(args).toContain("--api-key");
    expect(result.sessionId).toBe(TEST_SESSION_ID);
    expect(result.resultText).toBe("hello");
    expect(result.events.length).toBeGreaterThanOrEqual(3);
  });

  it("parses auth, model, session, and installation command outputs", async () => {
    const connection = new CursorCliConnection({
      commandRunner: async (_command, args) => {
        if (args[0] === CURSOR_CLI_COMMAND.VERSION) {
          return { stdout: "cursor-agent 1.2.3", stderr: "", exitCode: 0 };
        }
        if (args[0] === AGENT_MANAGEMENT_COMMAND.STATUS) {
          return { stdout: "✓ Logged in as netwearcdz@gmail.com", stderr: "", exitCode: 0 };
        }
        if (args[0] === AGENT_MANAGEMENT_COMMAND.MODELS) {
          return {
            stdout:
              "auto - Auto\nopus-4.6-thinking - Claude 4.6 Opus (Thinking)  (current, default)\n",
            stderr: "",
            exitCode: 0,
          };
        }
        if (args[0] === AGENT_MANAGEMENT_COMMAND.LIST) {
          return {
            stdout: "Requires TTY; use session_id from NDJSON system.init instead.",
            stderr: "",
            exitCode: 0,
          };
        }
        if (args[0] === CURSOR_CLI_COMMAND.CREATE_CHAT) {
          return { stdout: `Created chat ${TEST_SESSION_ID}`, stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: "", exitCode: 1 };
      },
    });

    const install = await connection.verifyInstallation();
    const auth = await connection.verifyAuth();
    const models = await connection.listModels();
    const managementStatus = await connection.runManagementCommand([
      AGENT_MANAGEMENT_COMMAND.STATUS,
    ]);
    const sessions = await connection.listSessions();
    const createdSessionId = await connection.createChat();

    expect(install.installed).toBe(true);
    expect(install.version).toBe("cursor-agent 1.2.3");
    expect(auth.authenticated).toBe(true);
    expect(auth.email).toBe("netwearcdz@gmail.com");
    expect(models.models.length).toBe(2);
    expect(models.defaultModel).toBe("opus-4.6-thinking");
    expect(managementStatus.stdout).toContain("Logged in as");
    expect(sessions).toEqual([]);
    expect(createdSessionId).toBe(TEST_SESSION_ID);
  });

  it("kills active process groups on disconnect", async () => {
    const killCalls: Array<{ pid: number; signal: NodeJS.Signals }> = [];
    const script = "setInterval(() => {}, 1000);";
    const connection = new CursorCliConnection({
      spawnFn: () =>
        spawn(process.execPath, ["-e", script], {
          stdio: ["pipe", "pipe", "pipe"],
        }),
      killFn: (pid, signal) => {
        killCalls.push({ pid, signal });
        process.kill(pid, signal);
      },
    });

    const promptPromise = connection.spawnPrompt({ prompt: "long running prompt" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await connection.disconnect();
    await promptPromise;

    expect(killCalls.length).toBeGreaterThanOrEqual(1);
    expect(killCalls.some((call) => call.signal === "SIGTERM")).toBe(true);
  });

  it("parses non-uuid session identifiers from list output", async () => {
    const connection = new CursorCliConnection({
      commandRunner: async (_command, args) => {
        if (args[0] === AGENT_MANAGEMENT_COMMAND.LIST) {
          return {
            stdout:
              "session-resume-id Active session model: gpt-5 messages: 14 createdAt=2026-02-11T18:30:00Z\nanother-session-id done",
            stderr: "",
            exitCode: 0,
          };
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    const sessions = await connection.listSessions();
    expect(sessions).toEqual([
      {
        id: "session-resume-id",
        title: "Active session",
        createdAt: "2026-02-11T18:30:00.000Z",
        model: "gpt-5",
        messageCount: 14,
      },
      { id: "another-session-id", title: "done" },
    ]);
  });

  it("surfaces list session command errors", async () => {
    const connection = new CursorCliConnection({
      commandRunner: async (_command, args) => {
        if (args[0] === AGENT_MANAGEMENT_COMMAND.LIST) {
          return {
            stdout: "",
            stderr: "requires tty",
            exitCode: 1,
          };
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    await expect(connection.listSessions()).rejects.toThrow("requires tty");
  });

  it("surfaces list model command errors", async () => {
    const connection = new CursorCliConnection({
      commandRunner: async (_command, args) => {
        if (args[0] === AGENT_MANAGEMENT_COMMAND.MODELS) {
          return {
            stdout: "",
            stderr: "models endpoint unavailable",
            exitCode: 1,
          };
        }
        return { stdout: "", stderr: "", exitCode: 0 };
      },
    });

    await expect(connection.listModels()).rejects.toThrow("models endpoint unavailable");
  });
});
