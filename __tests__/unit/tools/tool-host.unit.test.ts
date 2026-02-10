import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ToolHost } from "@/tools/tool-host";
import { describe, expect, it } from "vitest";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toadstool-tool-host-"));

describe("ToolHost", () => {
  it("reads and writes files", async () => {
    const baseDir = await createTempDir();
    const host = new ToolHost({ baseDir });

    await host.writeTextFile({
      sessionId: "session-1",
      path: join(baseDir, "file.txt"),
      content: "line1\nline2\nline3",
    });

    const response = await host.readTextFile({
      sessionId: "session-1",
      path: join(baseDir, "file.txt"),
      line: 2,
      limit: 1,
    });

    expect(response.content).toBe("line2");
    await rm(baseDir, { recursive: true, force: true });
  });

  it("creates and tracks terminal output", async () => {
    const baseDir = await createTempDir();
    const host = new ToolHost({ baseDir });

    const createResponse = await host.createTerminal({
      sessionId: "session-1",
      command: process.execPath,
      args: ["-e", "console.log('hi')"],
    });

    const exit = await host.waitForTerminalExit({
      sessionId: "session-1",
      terminalId: createResponse.terminalId,
    });

    expect(exit.exitCode).toBe(0);

    const output = await host.terminalOutput({
      sessionId: "session-1",
      terminalId: createResponse.terminalId,
    });

    expect(output.output).toContain("hi");

    await host.releaseTerminal({
      sessionId: "session-1",
      terminalId: createResponse.terminalId,
    });

    await rm(baseDir, { recursive: true, force: true });
  });
});
