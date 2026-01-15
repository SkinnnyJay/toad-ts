import { describe, expect, it } from "vitest";
import { parseMcpConfig } from "../../../src/core/mcp-config";

const env = {
  CMD: "node",
  MCP_URL: "https://mcp.example.com",
  API_KEY: "secret",
} as const;

describe("mcp-config", () => {
  it("parses valid MCP configs with env expansion", () => {
    const servers = parseMcpConfig(
      {
        mcpServers: {
          local: {
            command: "$CMD",
            args: ["--config", "${API_KEY}"],
            env: {
              TOKEN: "${API_KEY}",
            },
          },
          remote: {
            url: "${MCP_URL}",
            headers: {
              Authorization: "Bearer $API_KEY",
            },
          },
          events: {
            type: "sse",
            url: "${MCP_URL}/events",
          },
        },
      },
      env
    );

    expect(servers).toHaveLength(3);
    expect(servers.find((server) => server.name === "local")).toMatchObject({
      command: "node",
      args: ["--config", "secret"],
      env: [{ name: "TOKEN", value: "secret" }],
    });
    expect(servers.find((server) => server.name === "remote")).toMatchObject({
      type: "http",
      url: "https://mcp.example.com",
      headers: [{ name: "Authorization", value: "Bearer secret" }],
    });
    expect(servers.find((server) => server.name === "events")).toMatchObject({
      type: "sse",
      url: "https://mcp.example.com/events",
    });
  });

  it("rejects invalid MCP configs", () => {
    expect(() =>
      parseMcpConfig({
        mcpServers: {
          bad: {
            url: "https://mcp.example.com",
            command: "node",
          },
        },
      })
    ).toThrow("cannot mix url and command");

    expect(() =>
      parseMcpConfig(
        {
          mcpServers: {
            missing: {
              command: "${MISSING}",
            },
          },
        },
        {}
      )
    ).toThrow("Missing environment variable");
  });
});
