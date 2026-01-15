/**
 * Analytics TelemetryStorage
 *
 * A TelemetryStorage implementation that bridges token-optimizer analytics
 * to the central analytics system without modifying the token-optimizer.
 *
 * Usage:
 *   import { createAnalyticsTelemetryStorage } from "./analyticsTelemetryStorage";
 *   import { analytics } from "@/lib/server/analytics";
 *
 *   const telemetryStorage = createAnalyticsTelemetryStorage({
 *     analyticsService: analytics,
 *     compressionType: "json",
 *     agentId: "123",
 *     chatId: "456",
 *   });
 *
 *   const optimizer = new TokenOptimizer({ telemetryStorage, ... });
 */

import type { AnalyticsService } from "./stubs/analytics";
import type { TelemetryStorage } from "./telemetryStorage";
import type { AnalyticsSnapshot } from "./tokenOptimizer.types";

export interface AnalyticsTelemetryStorageConfig {
  /** The analytics service instance to use */
  analyticsService: AnalyticsService;
  /** Compression type being used (for dimension tracking) */
  compressionType?: string;
  /** Agent ID for context */
  agentId?: string;
  /** Chat ID for context */
  chatId?: string;
  /** Also persist to another storage (e.g., JSON file) */
  fallbackStorage?: TelemetryStorage;
}

/**
 * Create a TelemetryStorage that bridges to the analytics system
 */
export const createAnalyticsTelemetryStorage = (
  config: AnalyticsTelemetryStorageConfig
): TelemetryStorage => {
  const snapshots: AnalyticsSnapshot[] = [];

  return {
    async persistSnapshot(snapshot: AnalyticsSnapshot): Promise<void> {
      // Store locally for fetchRecent
      snapshots.push(snapshot);

      // Cap local storage
      if (snapshots.length > 1000) {
        snapshots.shift();
      }

      // Bridge to analytics service
      await config.analyticsService.trackTokenOptimization(snapshot, {
        compressionType: config.compressionType,
        agentId: config.agentId,
        chatId: config.chatId,
      });

      // Also persist to fallback if configured
      if (config.fallbackStorage) {
        await config.fallbackStorage.persistSnapshot(snapshot);
      }
    },

    async fetchRecent(limit?: number): Promise<AnalyticsSnapshot[]> {
      // If fallback storage exists, prefer it for historical data
      if (config.fallbackStorage) {
        return config.fallbackStorage.fetchRecent(limit);
      }

      // Otherwise use local cache
      if (typeof limit === "number" && limit >= 0) {
        return snapshots.slice(-limit).reverse();
      }
      return snapshots.slice().reverse();
    },

    async purge(): Promise<void> {
      snapshots.length = 0;

      if (config.fallbackStorage) {
        await config.fallbackStorage.purge();
      }
    },
  };
};

/**
 * Create a composite TelemetryStorage that writes to multiple storages
 */
export const createCompositeTelemetryStorage = (storages: TelemetryStorage[]): TelemetryStorage => {
  return {
    async persistSnapshot(snapshot: AnalyticsSnapshot): Promise<void> {
      await Promise.all(storages.map((storage) => storage.persistSnapshot(snapshot)));
    },

    async fetchRecent(limit?: number): Promise<AnalyticsSnapshot[]> {
      // Return from first storage that has data
      for (const storage of storages) {
        const results = await storage.fetchRecent(limit);
        if (results.length > 0) {
          return results;
        }
      }
      return [];
    },

    async purge(): Promise<void> {
      await Promise.all(storages.map((storage) => storage.purge()));
    },
  };
};
