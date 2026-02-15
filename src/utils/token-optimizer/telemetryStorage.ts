import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { LIMIT } from "@/config/limits";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";
import { INDENT_SPACES } from "@/constants/json-format";

import { z } from "zod";
import { invalidateCachedText, readTextCached } from "./stubs/fs";
import { type AnalyticsSnapshot, analyticsSnapshotSchema } from "./tokenOptimizer.types";

export interface TelemetryStorage {
  persistSnapshot(snapshot: AnalyticsSnapshot): Promise<void>;
  fetchRecent(limit?: number): Promise<AnalyticsSnapshot[]>;
  purge(): Promise<void>;
}

export const telemetryStorageKindSchema = z.enum(["JSON"]);

export type TelemetryStorageKind = z.infer<typeof telemetryStorageKindSchema>;

export const jsonTelemetryStorageConfigSchema = z.object({
  filePath: z.string().min(1),
});

export type JsonTelemetryStorageConfig = z.infer<typeof jsonTelemetryStorageConfigSchema>;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error;
}

const readSnapshots = async (filePath: string): Promise<AnalyticsSnapshot[]> => {
  try {
    const content = await readTextCached(filePath);
    if (!content) {
      return [];
    }

    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((snapshot) => {
        try {
          return analyticsSnapshotSchema.parse(snapshot);
        } catch (_error) {
          return null;
        }
      })
      .filter((snapshot): snapshot is AnalyticsSnapshot => snapshot !== null);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return [];
    }

    throw error;
  }
};

const writeSnapshots = async (filePath: string, snapshots: AnalyticsSnapshot[]): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(snapshots, null, INDENT_SPACES), ENCODING.UTF8);
  invalidateCachedText(filePath);
};

export const createJsonTelemetryStorage = (
  rawConfig: JsonTelemetryStorageConfig
): TelemetryStorage => {
  const config = jsonTelemetryStorageConfigSchema.parse(rawConfig);
  let cachedSnapshots: AnalyticsSnapshot[] | null = null;
  let pendingSnapshots: AnalyticsSnapshot[] = [];
  let flushTimer: NodeJS.Timeout | null = null;
  let flushPromise: Promise<void> | null = null;

  const ensureLoadedSnapshots = async (): Promise<AnalyticsSnapshot[]> => {
    if (cachedSnapshots) {
      return cachedSnapshots;
    }
    cachedSnapshots = await readSnapshots(config.filePath);
    return cachedSnapshots;
  };

  const clearFlushTimer = (): void => {
    if (!flushTimer) {
      return;
    }
    clearTimeout(flushTimer);
    flushTimer = null;
  };

  const flushPendingSnapshots = async (): Promise<void> => {
    if (flushPromise) {
      await flushPromise;
      return;
    }

    flushPromise = (async () => {
      clearFlushTimer();
      if (pendingSnapshots.length === 0) {
        return;
      }
      const persisted = await ensureLoadedSnapshots();
      const batch = pendingSnapshots;
      pendingSnapshots = [];
      try {
        persisted.push(...batch);
        await writeSnapshots(config.filePath, persisted);
      } catch (error) {
        pendingSnapshots = [...batch, ...pendingSnapshots];
        if (cachedSnapshots) {
          cachedSnapshots = cachedSnapshots.slice(
            0,
            Math.max(0, cachedSnapshots.length - batch.length)
          );
        }
        throw error;
      }
    })().finally(() => {
      flushPromise = null;
    });

    await flushPromise;
  };

  const scheduleFlush = (): void => {
    if (flushTimer) {
      return;
    }
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushPendingSnapshots();
    }, LIMIT.TELEMETRY_WRITE_FLUSH_INTERVAL_MS);
    flushTimer.unref();
  };

  return {
    async persistSnapshot(snapshot) {
      const sanitized = analyticsSnapshotSchema.parse(snapshot);
      pendingSnapshots.push(sanitized);
      if (pendingSnapshots.length >= LIMIT.TELEMETRY_WRITE_BATCH_SIZE) {
        await flushPendingSnapshots();
        return;
      }
      scheduleFlush();
    },

    async fetchRecent(limit) {
      await flushPendingSnapshots();
      const existing = await ensureLoadedSnapshots();
      if (typeof limit === "number" && limit >= 0) {
        return existing.slice(-limit).reverse();
      }

      return existing.slice().reverse();
    },

    async purge() {
      clearFlushTimer();
      pendingSnapshots = [];
      cachedSnapshots = [];
      await writeSnapshots(config.filePath, []);
    },
  };
};
