import type { HookGroup, HooksConfig } from "@/config/app-config";
import { HOOK_EVENT_VALUES } from "@/constants/hook-events";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("PluginScopedHooks");

export interface PluginHookRegistration {
  pluginName: string;
  enabled: boolean;
  hooks: HooksConfig;
}

/**
 * Manage plugin-scoped hooks that only activate when their plugin is enabled.
 * Each plugin can register hooks for lifecycle events, but they only fire
 * when the plugin is in the active plugins list.
 */
export class PluginScopedHookManager {
  private readonly registrations = new Map<string, PluginHookRegistration>();

  register(pluginName: string, hooks: HooksConfig): void {
    this.registrations.set(pluginName, {
      pluginName,
      enabled: true,
      hooks,
    });
    logger.info("Registered plugin hooks", { plugin: pluginName });
  }

  enable(pluginName: string): void {
    const reg = this.registrations.get(pluginName);
    if (reg) reg.enabled = true;
  }

  disable(pluginName: string): void {
    const reg = this.registrations.get(pluginName);
    if (reg) reg.enabled = false;
  }

  isEnabled(pluginName: string): boolean {
    return this.registrations.get(pluginName)?.enabled ?? false;
  }

  /**
   * Get all active hooks for a specific event, filtered to only enabled plugins.
   */
  getActiveHooks(event: string): HookGroup[] {
    const groups: HookGroup[] = [];
    for (const reg of this.registrations.values()) {
      if (!reg.enabled) continue;
      const eventHooks = reg.hooks[event as keyof HooksConfig];
      if (eventHooks) {
        groups.push(...eventHooks);
      }
    }
    return groups;
  }

  /**
   * Merge plugin hooks into the base hooks config, respecting enabled state.
   */
  mergeIntoConfig(baseHooks: HooksConfig): HooksConfig {
    const merged = { ...baseHooks };
    for (const event of HOOK_EVENT_VALUES) {
      const pluginGroups = this.getActiveHooks(event);
      if (pluginGroups.length > 0) {
        const existing = merged[event] ?? [];
        merged[event] = [...existing, ...pluginGroups];
      }
    }
    return merged;
  }

  list(): PluginHookRegistration[] {
    return Array.from(this.registrations.values());
  }
}
