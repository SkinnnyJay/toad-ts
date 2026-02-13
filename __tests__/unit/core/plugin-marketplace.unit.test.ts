import { TIMEOUT } from "@/config/timeouts";
import {
  type MarketplacePlugin,
  fetchPluginRegistry,
  installPlugin,
  searchPlugins,
} from "@/core/plugin-marketplace";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

const createPlugin = (overrides: Partial<MarketplacePlugin> = {}): MarketplacePlugin => {
  return {
    name: "plugin-a",
    version: "1.0.0",
    description: "Formatter plugin",
    author: "team",
    repository: "https://example.com/a",
    category: "formatters",
    installCommand: "npm i plugin-a",
    downloads: 10,
    ...overrides,
  };
};

describe("plugin-marketplace", () => {
  beforeEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns plugins from registry when fetch succeeds", async () => {
    const plugins = [createPlugin()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plugins }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPluginRegistry("https://registry.test")).resolves.toEqual(plugins);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://registry.test",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: { Accept: "application/json" },
      })
    );
  });

  it("returns empty list when registry fetch is unavailable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPluginRegistry()).resolves.toEqual([]);
  });

  it("filters plugins by search query", () => {
    const plugins = [
      createPlugin({ name: "alpha", description: "Lint helper", category: "tools" }),
      createPlugin({ name: "beta", description: "Theme preset", category: "ui" }),
    ];

    expect(searchPlugins(plugins, "theme").map((plugin) => plugin.name)).toEqual(["beta"]);
  });

  it("installs plugin with configured timeout", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    await expect(installPlugin(createPlugin(), "/workspace")).resolves.toEqual({ ok: true });
    expect(execaMock).toHaveBeenCalledWith("npm", ["i", "plugin-a"], {
      cwd: "/workspace",
      timeout: TIMEOUT.PLUGIN_INSTALL_MS,
    });
  });

  it("returns failure for invalid install command", async () => {
    await expect(installPlugin(createPlugin({ installCommand: "" }))).resolves.toEqual({
      ok: false,
      error: "Invalid install command",
    });
  });
});
