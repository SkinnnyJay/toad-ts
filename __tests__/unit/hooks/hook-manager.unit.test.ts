import type { HooksConfig } from "@/config/app-config";
import { LIMIT } from "@/config/limits";
import { HOOK_EVENT } from "@/constants/hook-events";
import { HOOK_TYPE } from "@/constants/hook-types";
import { HookManager } from "@/hooks/hook-manager";
import { describe, expect, it, vi } from "vitest";

describe("HookManager", () => {
  it("runs command hooks when matcher matches", async () => {
    const commandRunner = vi.fn(async () => ({ allow: true }));
    const hooks: HooksConfig = {
      [HOOK_EVENT.PRE_TOOL_USE]: [
        {
          matcher: "bash",
          hooks: [{ type: HOOK_TYPE.COMMAND, command: "echo" }],
        },
      ],
    };
    const manager = new HookManager({ hooks, commandRunner });

    const result = await manager.runHooks(
      HOOK_EVENT.PRE_TOOL_USE,
      {
        matcherTarget: "exec_bash",
        payload: { toolName: "exec_bash" },
      },
      { canBlock: true }
    );

    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(result.allow).toBe(true);
  });

  it("skips hooks when matcher does not match", async () => {
    const commandRunner = vi.fn(async () => ({ allow: true }));
    const hooks: HooksConfig = {
      [HOOK_EVENT.PRE_TOOL_USE]: [
        {
          matcher: "read",
          hooks: [{ type: HOOK_TYPE.COMMAND, command: "echo" }],
        },
      ],
    };
    const manager = new HookManager({ hooks, commandRunner });

    await manager.runHooks(
      HOOK_EVENT.PRE_TOOL_USE,
      { matcherTarget: "exec_bash", payload: { toolName: "exec_bash" } },
      { canBlock: true }
    );

    expect(commandRunner).not.toHaveBeenCalled();
  });

  it("blocks when command hook denies and canBlock is true", async () => {
    const commandRunner = vi.fn(async () => ({ allow: false, message: "blocked" }));
    const hooks: HooksConfig = {
      [HOOK_EVENT.PRE_TOOL_USE]: [
        {
          hooks: [{ type: HOOK_TYPE.COMMAND, command: "echo" }],
        },
      ],
    };
    const manager = new HookManager({ hooks, commandRunner });

    const result = await manager.runHooks(
      HOOK_EVENT.PRE_TOOL_USE,
      { matcherTarget: "exec_bash", payload: { toolName: "exec_bash" } },
      { canBlock: true }
    );

    expect(result.allow).toBe(false);
    expect(result.message).toBe("blocked");
  });

  it("runs prompt hooks when runner provided", async () => {
    const promptRunner = vi.fn(async () => ({ allow: true }));
    const hooks: HooksConfig = {
      [HOOK_EVENT.PERMISSION_REQUEST]: [
        {
          hooks: [{ type: HOOK_TYPE.PROMPT, prompt: "Allow?" }],
        },
      ],
    };
    const manager = new HookManager({ hooks, promptRunner });

    const result = await manager.runHooks(
      HOOK_EVENT.PERMISSION_REQUEST,
      { matcherTarget: "exec_bash", payload: { toolName: "exec_bash" } },
      { canBlock: true }
    );

    expect(promptRunner).toHaveBeenCalledTimes(1);
    expect(result.allow).toBe(true);
  });

  it("caps nested hook subprocess chains at configured depth", async () => {
    const commandRunner = vi.fn(async () => {
      await hookManager.runHooks(
        HOOK_EVENT.PRE_TOOL_USE,
        { matcherTarget: "exec_bash", payload: { toolName: "exec_bash" } },
        { canBlock: true }
      );
      return { allow: true };
    });

    const hooks: HooksConfig = {
      [HOOK_EVENT.PRE_TOOL_USE]: [
        {
          hooks: [{ type: HOOK_TYPE.COMMAND, command: "echo" }],
        },
      ],
    };
    const hookManager = new HookManager({ hooks, commandRunner });

    const result = await hookManager.runHooks(
      HOOK_EVENT.PRE_TOOL_USE,
      { matcherTarget: "exec_bash", payload: { toolName: "exec_bash" } },
      { canBlock: true }
    );

    expect(result.allow).toBe(true);
    expect(commandRunner).toHaveBeenCalledTimes(LIMIT.HOOK_CHAIN_MAX_DEPTH);
  });

  it("does not count concurrent root hooks against nested depth cap", async () => {
    let unblock: (() => void) | null = null;
    const blocker = new Promise<void>((resolve) => {
      unblock = resolve;
    });

    const commandRunner = vi.fn(async () => {
      await blocker;
      return { allow: true };
    });

    const hooks: HooksConfig = {
      [HOOK_EVENT.PRE_TOOL_USE]: [
        {
          hooks: [{ type: HOOK_TYPE.COMMAND, command: "echo" }],
        },
      ],
    };
    const hookManager = new HookManager({ hooks, commandRunner });

    const runs = Array.from({ length: LIMIT.HOOK_CHAIN_MAX_DEPTH + 1 }, () =>
      hookManager.runHooks(
        HOOK_EVENT.PRE_TOOL_USE,
        { matcherTarget: "exec_bash", payload: { toolName: "exec_bash" } },
        { canBlock: true }
      )
    );

    await Promise.resolve();
    if (!unblock) {
      throw new Error("Failed to initialize concurrent hook blocker.");
    }
    unblock();

    const results = await Promise.all(runs);
    expect(results.every((result) => result.allow)).toBe(true);
    expect(commandRunner).toHaveBeenCalledTimes(LIMIT.HOOK_CHAIN_MAX_DEPTH + 1);
  });
});
