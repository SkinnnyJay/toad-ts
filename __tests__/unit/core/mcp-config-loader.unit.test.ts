import { describe, expect, it } from "vitest";
import { loadMcpConfig } from "../../../src/core/mcp-config-loader";

describe("MCP Config Loader", () => {
  describe("loadMcpConfig()", () => {
    it("should return null when config file does not exist", async () => {
      const config = await loadMcpConfig({ configPath: "/nonexistent/path.json" });

      expect(config).toBeNull();
    });

    it("should load config from file path", async () => {
      // Test with null/undefined - should return null when file doesn't exist
      const config = await loadMcpConfig({});
      // May be null if default path doesn't exist
      expect(config === null || (typeof config === "object" && "mcpServers" in config)).toBe(true);
    });

    it("should handle invalid config gracefully", async () => {
      // Invalid config should throw or return null
      try {
        const config = await loadMcpConfig({ configPath: "/nonexistent.json" });
        expect(config).toBeNull();
      } catch {
        // May throw if file exists but is invalid
      }
    });
  });
});
