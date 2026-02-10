import { HOOK_EVENT } from "@/constants/hook-events";
import type { ToolName } from "@/constants/tool-names";
import { getHookManager } from "@/hooks/hook-service";
import type { ToolContext, ToolDefinition, ToolResult } from "@/tools/types";
import { SessionIdSchema } from "@/types/domain";

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
    const hookManager = getHookManager();
    const sessionId = context.sessionId ? SessionIdSchema.parse(context.sessionId) : undefined;
    if (hookManager) {
      const decision = await hookManager.runHooks(
        HOOK_EVENT.PRE_TOOL_USE,
        {
          matcherTarget: name,
          sessionId,
          payload: {
            toolName: name,
            input,
          },
        },
        { canBlock: true }
      );
      if (!decision.allow) {
        return { ok: false, error: decision.message ?? "Tool blocked by hook." };
      }
    }
    let result: ToolResult<unknown>;
    try {
      result = await tool.execute(input, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result = { ok: false, error: message };
    }
    if (hookManager) {
      void hookManager.runHooks(HOOK_EVENT.POST_TOOL_USE, {
        matcherTarget: name,
        sessionId,
        payload: {
          toolName: name,
          input,
          result,
        },
      });
    }
    return result;
  }
}
