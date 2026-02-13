import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SEMVER_COMPONENT_COUNT } from "@/config/limits";
import { BOOLEAN_STRINGS } from "@/constants/boolean-strings";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { FILE_PATH } from "@/constants/file-paths";
import { INDENT_SPACES } from "@/constants/json-format";
import { CHECK_INTERVAL_MS, FETCH_TIMEOUT_MS, REGISTRY_BASE_URL } from "@/constants/update-check";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { loadPackageInfo } from "@/utils/package-info";
import { z } from "zod";

const logger = createClassLogger("UpdateCheck");

const updateCacheSchema = z
  .object({
    lastChecked: z.number().nonnegative(),
    latestVersion: z.string().min(1).optional(),
  })
  .strict();

const registryResponseSchema = z
  .object({
    "dist-tags": z.object({
      latest: z.string().min(1),
    }),
  })
  .strict();

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;

const cachePath = (cwd: string): string =>
  path.join(cwd, FILE_PATH.TOADSTOOL_DIR, FILE_PATH.UPDATE_CACHE_JSON);

const parseVersion = (version: string): number[] => {
  const clean = version.split("-")[0] ?? version;
  const parts = clean.split(".");
  const numbers: number[] = [];
  for (let i = 0; i < SEMVER_COMPONENT_COUNT; i += 1) {
    const value = parts[i] ?? "0";
    numbers.push(Number.parseInt(value, 10));
  }
  return numbers;
};

export const isNewerVersion = (latest: string, current: string): boolean => {
  const latestParts = parseVersion(latest);
  const currentParts = parseVersion(current);
  for (let i = 0; i < SEMVER_COMPONENT_COUNT; i += 1) {
    const latestValue = latestParts[i] ?? 0;
    const currentValue = currentParts[i] ?? 0;
    if (latestValue > currentValue) return true;
    if (latestValue < currentValue) return false;
  }
  return false;
};

const readCache = async (cwd: string): Promise<z.infer<typeof updateCacheSchema> | null> => {
  try {
    const raw = await readFile(cachePath(cwd), ENCODING.UTF8);
    return updateCacheSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return null;
    }
    return null;
  }
};

const writeCache = async (
  cwd: string,
  payload: z.infer<typeof updateCacheSchema>
): Promise<void> => {
  const dir = path.join(cwd, FILE_PATH.TOADSTOOL_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(cachePath(cwd), JSON.stringify(payload, null, INDENT_SPACES), ENCODING.UTF8);
};

const fetchLatestVersion = async (packageName: string): Promise<string | null> => {
  const url = `${REGISTRY_BASE_URL}/${encodeURIComponent(packageName)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    const payload = registryResponseSchema.parse(await response.json());
    return payload["dist-tags"].latest;
  } catch (error) {
    logger.debug("Update check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const checkForUpdates = async (): Promise<void> => {
  const env = EnvManager.getInstance().getSnapshot();
  if (env[ENV_KEY.TOADSTOOL_DISABLE_UPDATE_CHECK]?.toLowerCase() === BOOLEAN_STRINGS.TRUE) {
    return;
  }

  const info = await loadPackageInfo();
  if (!info) {
    return;
  }

  const cwd = process.cwd();
  const cache = await readCache(cwd);
  const now = Date.now();
  if (cache && now - cache.lastChecked < CHECK_INTERVAL_MS) {
    if (cache.latestVersion && isNewerVersion(cache.latestVersion, info.version)) {
      logger.info("Update available", {
        current: info.version,
        latest: cache.latestVersion,
      });
    }
    return;
  }

  const latest = await fetchLatestVersion(info.name);
  if (!latest) {
    return;
  }
  await writeCache(cwd, { lastChecked: now, latestVersion: latest });
  if (isNewerVersion(latest, info.version)) {
    logger.info("Update available", { current: info.version, latest });
  }
};
