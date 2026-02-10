import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import { TOOL_KIND } from "@/constants/tool-kinds";
import { TOOL_NAME } from "@/constants/tool-names";
import { ToolRegistry } from "@/tools/registry";
import { createToolRuntime } from "@/tools/runtime";
import { describe, expect, it } from "vitest";

const createTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), "toadstool-tools-"));

describe("ToolRegistry", () => {
  it("registers and executes tools", async () => {
    const baseDir = await createTempDir();
    const runtime = createToolRuntime({ baseDir });
    const registry = new ToolRegistry();

    const inputSchema = z.object({ value: z.string().min(1) });
    registry.register({
      name: TOOL_NAME.QUESTION,
      description: "dummy",
      kind: TOOL_KIND.OTHER,
      inputSchema,
      execute: async (input) => {
        const parsed = inputSchema.parse(input);
        return { ok: true, output: `echo:${parsed.value}` };
      },
    });

    const result = await registry.execute(TOOL_NAME.QUESTION, { value: "test" }, runtime.context);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toBe("echo:test");
    }

    await rm(baseDir, { recursive: true, force: true });
  });

  it("prevents duplicate tool registration", async () => {
    const registry = new ToolRegistry();
    const inputSchema = z.object({ value: z.string().min(1) });

    registry.register({
      name: TOOL_NAME.READ,
      description: "dummy",
      kind: TOOL_KIND.READ,
      inputSchema,
      execute: async (input) => {
        const parsed = inputSchema.parse(input);
        return { ok: true, output: parsed.value };
      },
    });

    expect(() =>
      registry.register({
        name: TOOL_NAME.READ,
        description: "duplicate",
        kind: TOOL_KIND.READ,
        inputSchema,
        execute: async (input) => {
          const parsed = inputSchema.parse(input);
          return { ok: true, output: parsed.value };
        },
      })
    ).toThrow("Tool already registered");
  });
});
