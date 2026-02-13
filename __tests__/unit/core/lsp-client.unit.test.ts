import { TIMEOUT } from "@/config/timeouts";
import { createLSPStub, detectLanguageServers } from "@/core/lsp-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

describe("lsp-client", () => {
  beforeEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
  });

  it("detects installed language servers using configured timeout", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockImplementation(async (_command: string, args?: string[]) => {
      const candidate = (args?.[0] ?? "").trim();
      if (candidate === "typescript-language-server" || candidate === "gopls") {
        return { stdout: "/usr/bin/mock", stderr: "", exitCode: 0 };
      }
      throw new Error("not installed");
    });

    const servers = await detectLanguageServers();

    expect(servers.map((server) => server.command)).toEqual([
      "typescript-language-server",
      "gopls",
    ]);
    expect(execaMock).toHaveBeenCalled();
    for (const call of execaMock.mock.calls) {
      expect(call[0]).toBe("which");
      expect(call[2]).toMatchObject({ timeout: TIMEOUT.COMMAND_DISCOVERY_MS });
    }
  });

  it("provides no-op fallback operations in stub", async () => {
    const stub = createLSPStub();

    await expect(stub.goToDefinition("a.ts", 1, 1)).resolves.toBeNull();
    await expect(stub.findReferences("a.ts", 1, 1)).resolves.toEqual([]);
    await expect(stub.hover("a.ts", 1, 1)).resolves.toBeNull();
    await expect(stub.documentSymbols("a.ts")).resolves.toEqual([]);
    await expect(stub.workspaceSymbols("needle")).resolves.toEqual([]);
  });
});
