#!/usr/bin/env tsx

import { unlink } from "node:fs/promises";

import { createPersistenceConfig } from "../../src/store/persistence/persistence-config";
import { Env, EnvManager } from "../../src/utils/env/env.utils";

EnvManager.bootstrap();
const env = new Env(EnvManager.getInstance());
const persistenceConfig = createPersistenceConfig(env);
const DB_PATH = persistenceConfig.sqlite?.filePath;
if (!DB_PATH) {
  throw new Error("SQLite configuration missing");
}

async function clearDatabase() {
  const dbPath = DB_PATH as string;
  try {
    await unlink(dbPath);
    console.log("✅ Database cleared successfully");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("ℹ️  Database file does not exist");
    } else {
      console.error("❌ Failed to clear database:", (error as Error).message);
      process.exit(1);
    }
  }
}

clearDatabase();
