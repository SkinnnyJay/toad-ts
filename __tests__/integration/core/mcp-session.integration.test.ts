import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadMcpConfig } from "../../../src/core/mcp-config-loader";
import { SessionManager } from "../../../src/core/session-manager";
import { useAppStore } from "../../../src/store/app-store";
import { AgentIdSchema, SessionIdSchema } from "../../../src/types/domain";

describe("MCP session integration", () => {
  it("passes MCP servers into newSession and stores metadata", async () => {
    const store = useAppStore.getState();
    store.reset();
    let captured: { cwd: string; mcpServers: unknown[] } | undefined;
    const client = {
      newSession: async ({ cwd, mcpServers }: { cwd: string; mcpServers: unknown[] }) => {
        captured = { cwd, mcpServers };
        return { sessionId: "s-mcp" };
      },
    };

    const manager = new SessionManager(client, store);
    await manager.createSession({
      cwd: "/tmp",
      agentId: AgentIdSchema.parse("agent-mcp"),
      title: "MCP Session",
      now: 1234,
      env: { CMD: "node" },
      mcpConfig: {
        mcpServers: {
          local: { command: "$CMD" },
        },
      },
    });

    expect(captured?.cwd).toBe("/tmp");
    expect(captured?.mcpServers).toHaveLength(1);
    expect(captured?.mcpServers[0]).toMatchObject({ name: "local", command: "node" });

    const stored = store.getSession(SessionIdSchema.parse("s-mcp"));
    expect(stored?.metadata?.mcpServers).toHaveLength(1);
    expect(stored?.metadata?.mcpServers[0]).toMatchObject({ name: "local", command: "node" });
  });

  it("gracefully handles missing MCP config by falling back to empty servers", async () => {
    const missingPath = join(process.cwd(), "non-existent-mcp-config.json");
    const config = await loadMcpConfig({ configPath: missingPath });
    expect(config).toBeNull();

    const store = useAppStore.getState();
    store.reset();
    let captured: { cwd: string; mcpServers: unknown[] } | undefined;
    const client = {
      newSession: async ({ cwd, mcpServers }: { cwd: string; mcpServers: unknown[] }) => {
        captured = { cwd, mcpServers };
        return { sessionId: "s-mcp-none" };
      },
    };

    const manager = new SessionManager(client, store);
    const session = await manager.createSession({
      cwd: "/tmp/missing-mcp",
      agentId: AgentIdSchema.parse("agent-mcp"),
      title: "Missing MCP",
      mcpConfig: config,
    });

    expect(captured?.mcpServers).toEqual([]);
    const stored = store.getSession(session.id);
    expect(stored?.metadata?.mcpServers).toEqual([]);
  });
});
