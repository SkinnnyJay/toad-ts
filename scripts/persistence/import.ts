#!/usr/bin/env tsx

import { readFileSync } from "node:fs";

import { createPersistenceConfig } from "../../src/store/persistence/persistence-config";
import { createPersistenceProvider } from "../../src/store/persistence/persistence-provider";
import { Env, EnvManager } from "../../src/utils/env/env.utils";

EnvManager.bootstrap();
const env = new Env(EnvManager.getInstance());
const persistenceConfig = createPersistenceConfig(env);

async function importData() {
  console.log("📥 Importing persistence data...");

  try {
    const input = readFileSync(0, "utf-8");
    const data = JSON.parse(input);

    const provider = createPersistenceProvider(persistenceConfig);
    await provider.save(data);
    await provider.close();
    console.log("✅ Data imported successfully");
  } catch (error) {
    console.error("❌ Import failed:", (error as Error).message);
    process.exit(1);
  }
}

importData();
