import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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

  return {
    async persistSnapshot(snapshot) {
      const sanitized = analyticsSnapshotSchema.parse(snapshot);
      const existing = await readSnapshots(config.filePath);
      existing.push(sanitized);
      await writeSnapshots(config.filePath, existing);
    },

    async fetchRecent(limit) {
      const existing = await readSnapshots(config.filePath);
      if (typeof limit === "number" && limit >= 0) {
        return existing.slice(-limit).reverse();
      }

      return existing.slice().reverse();
    },

    async purge() {
      await writeSnapshots(config.filePath, []);
    },
  };
};
