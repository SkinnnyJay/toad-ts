import { homedir } from "node:os";
import { join } from "node:path";
import { TIMEOUT } from "@/config/timeouts";
import { ENV_KEY } from "@/constants/env-keys";
import { FILE_PATH } from "@/constants/file-paths";
import { PERSISTENCE_PROVIDER } from "@/constants/persistence-providers";
import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";

import type { Env } from "@/utils/env/env.utils";
import type { PersistenceConfig } from "./persistence-provider";

const DEFAULT_PROVIDER = PERSISTENCE_PROVIDER.JSON;
const DEFAULT_JSON_PATH = join(homedir(), FILE_PATH.TOADSTOOL_DIR, FILE_PATH.SESSIONS_JSON);
const DEFAULT_SQLITE_PATH = join(homedir(), FILE_PATH.TOADSTOOL_DIR, FILE_PATH.TOADSTOOL_DB);
const DEFAULT_WRITE_MODE = PERSISTENCE_WRITE_MODE.PER_MESSAGE;
const DEFAULT_BATCH_DELAY = TIMEOUT.BATCH_DELAY_MS;

const normalizeProvider = (value: string): PersistenceConfig["provider"] => {
  if (value === PERSISTENCE_PROVIDER.SQLITE) return PERSISTENCE_PROVIDER.SQLITE;
  return PERSISTENCE_PROVIDER.JSON;
};

const normalizeWriteMode = (
  value: string
): NonNullable<PersistenceConfig["sqlite"]>["writeMode"] => {
  if (
    value === PERSISTENCE_WRITE_MODE.PER_TOKEN ||
    value === PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE
  ) {
    return value;
  }
  return PERSISTENCE_WRITE_MODE.PER_MESSAGE;
};

export const createPersistenceConfig = (env: Env): PersistenceConfig => {
  const provider = normalizeProvider(
    env.getString(ENV_KEY.TOADSTOOL_PERSISTENCE_PROVIDER, DEFAULT_PROVIDER)
  );

  const jsonPath = env.getString(ENV_KEY.TOADSTOOL_PERSISTENCE_JSON_PATH, DEFAULT_JSON_PATH);
  const sqlitePath = env.getString(ENV_KEY.TOADSTOOL_PERSISTENCE_SQLITE_PATH, DEFAULT_SQLITE_PATH);
  const writeMode = normalizeWriteMode(
    env.getString(ENV_KEY.TOADSTOOL_PERSISTENCE_SQLITE_WRITE_MODE, DEFAULT_WRITE_MODE)
  );
  const batchDelay = env.getNumber(
    ENV_KEY.TOADSTOOL_PERSISTENCE_SQLITE_BATCH_DELAY,
    DEFAULT_BATCH_DELAY
  );

  return {
    provider,
    json: {
      filePath: jsonPath,
    },
    sqlite: {
      filePath: sqlitePath,
      writeMode,
      batchDelay,
    },
  };
};
