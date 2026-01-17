import { describe, expect, it } from "vitest";
import type { HarnessAdapter, HarnessConfig } from "../../../src/harness/harnessAdapter";
import { harnessConfigSchema } from "../../../src/harness/harnessConfig";
import { HarnessRegistry } from "../../../src/harness/harnessRegistry";

describe("HarnessRegistry", () => {
  const createMockAdapter = (id: string, name: string): HarnessAdapter<HarnessConfig> => ({
    id,
    name,
    configSchema: harnessConfigSchema,
    createRuntime: vi.fn(),
  });

  describe("constructor", () => {
    it("should create empty registry", () => {
      const registry = new HarnessRegistry();
      expect(registry.list()).toEqual([]);
    });

    it("should create registry with initial adapters", () => {
      const adapter1 = createMockAdapter("adapter-1", "Adapter 1");
      const adapter2 = createMockAdapter("adapter-2", "Adapter 2");
      const registry = new HarnessRegistry([adapter1, adapter2]);

      expect(registry.list()).toHaveLength(2);
      expect(registry.has("adapter-1")).toBe(true);
      expect(registry.has("adapter-2")).toBe(true);
    });
  });

  describe("register()", () => {
    it("should register adapter", () => {
      const registry = new HarnessRegistry();
      const adapter = createMockAdapter("test-adapter", "Test Adapter");

      registry.register(adapter);

      expect(registry.has("test-adapter")).toBe(true);
      expect(registry.get("test-adapter")).toBe(adapter);
    });

    it("should overwrite existing adapter with same id", () => {
      const registry = new HarnessRegistry();
      const adapter1 = createMockAdapter("test", "Adapter 1");
      const adapter2 = createMockAdapter("test", "Adapter 2");

      registry.register(adapter1);
      registry.register(adapter2);

      expect(registry.get("test")?.name).toBe("Adapter 2");
      expect(registry.list()).toHaveLength(1);
    });
  });

  describe("get()", () => {
    it("should return registered adapter", () => {
      const registry = new HarnessRegistry();
      const adapter = createMockAdapter("test", "Test");
      registry.register(adapter);

      expect(registry.get("test")).toBe(adapter);
    });

    it("should return undefined for unregistered adapter", () => {
      const registry = new HarnessRegistry();
      expect(registry.get("unknown")).toBeUndefined();
    });
  });

  describe("has()", () => {
    it("should return true for registered adapter", () => {
      const registry = new HarnessRegistry();
      const adapter = createMockAdapter("test", "Test");
      registry.register(adapter);

      expect(registry.has("test")).toBe(true);
    });

    it("should return false for unregistered adapter", () => {
      const registry = new HarnessRegistry();
      expect(registry.has("unknown")).toBe(false);
    });
  });

  describe("list()", () => {
    it("should return all registered adapters", () => {
      const registry = new HarnessRegistry();
      const adapter1 = createMockAdapter("adapter-1", "Adapter 1");
      const adapter2 = createMockAdapter("adapter-2", "Adapter 2");
      const adapter3 = createMockAdapter("adapter-3", "Adapter 3");

      registry.register(adapter1);
      registry.register(adapter2);
      registry.register(adapter3);

      const list = registry.list();
      expect(list).toHaveLength(3);
      expect(list.map((a) => a.id)).toContain("adapter-1");
      expect(list.map((a) => a.id)).toContain("adapter-2");
      expect(list.map((a) => a.id)).toContain("adapter-3");
    });

    it("should return empty array for empty registry", () => {
      const registry = new HarnessRegistry();
      expect(registry.list()).toEqual([]);
    });
  });
});
