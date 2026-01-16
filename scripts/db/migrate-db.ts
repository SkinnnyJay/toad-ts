#!/usr/bin/env tsx

import { createPersistenceConfig } from "../../src/store/persistence/persistence-config";
import { createSqlitePersistenceProvider } from "../../src/store/persistence/sqlite-provider";
import { Env, EnvManager } from "../../src/utils/env/env.utils";

EnvManager.bootstrap();
const env = new Env(EnvManager.getInstance());
const persistenceConfig = createPersistenceConfig(env);

async function migrateDatabase() {
  console.log("🔄 Running database migrations...");

  if (!persistenceConfig.sqlite) {
    throw new Error("SQLite configuration missing");
  }

  const provider = createSqlitePersistenceProvider(persistenceConfig.sqlite);
  await provider.load();
  await provider.close();

  console.log("✅ Database migrations completed");
  console.log(`📍 Database location: ${persistenceConfig.sqlite.filePath}`);
}

migrateDatabase().catch((error) => {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
});
