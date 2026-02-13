import { createCliHarnessAdapter } from "@/core/cli-agent/create-cli-harness-adapter";
import { MockHarnessRuntime } from "@/core/mock-harness";
import { harnessConfigSchema } from "@/harness/harnessConfig";
import { describe, expect, it, vi } from "vitest";

describe("createCliHarnessAdapter", () => {
  it("builds harness adapter with provided identity and runtime factory", () => {
    const runtime = new MockHarnessRuntime();
    const createRuntime = vi.fn(() => runtime);

    const adapter = createCliHarnessAdapter({
      id: "test-cli",
      name: "Test CLI",
      configSchema: harnessConfigSchema,
      createRuntime,
    });

    const config = harnessConfigSchema.parse({
      id: "test-cli",
      name: "Test CLI",
      command: "test-agent",
      args: [],
      env: {},
    });
    const created = adapter.createHarness(config);

    expect(adapter.id).toBe("test-cli");
    expect(adapter.name).toBe("Test CLI");
    expect(createRuntime).toHaveBeenCalledWith(config);
    expect(created).toBe(runtime);
  });
});
