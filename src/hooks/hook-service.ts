import type { HookManager } from "@/hooks/hook-manager";

let activeHookManager: HookManager | null = null;

export const setHookManager = (manager: HookManager | null): void => {
  activeHookManager = manager;
};

export const getHookManager = (): HookManager | null => activeHookManager;
