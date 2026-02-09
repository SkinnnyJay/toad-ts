import type { ToolName } from "@/constants/tool-names";
import type { ToolContext, ToolDefinition, ToolResult } from "@/tools/types";

export class ToolRegistry {
  private readonly tools = new Map<ToolName, ToolDefinition<unknown>>();

  register(tool: ToolDefinition<unknown>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  registerAll(tools: Array<ToolDefinition<unknown>>): void {
    tools.forEach((tool) => this.register(tool));
  }

  get(name: ToolName): ToolDefinition<unknown> | undefined {
    return this.tools.get(name);
  }

  list(): Array<ToolDefinition<unknown>> {
    return Array.from(this.tools.values());
  }

  async execute(
    name: ToolName,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult<unknown>> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { ok: false, error: `Tool not found: ${name}` };
    }
    try {
      return await tool.execute(input, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  }
}
