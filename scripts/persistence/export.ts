#!/usr/bin/env tsx

import { createPersistenceConfig } from "../../src/store/persistence/persistence-config";
import { createPersistenceProvider } from "../../src/store/persistence/persistence-provider";
import { Env, EnvManager } from "../../src/utils/env/env.utils";

EnvManager.bootstrap();
const env = new Env(EnvManager.getInstance());
const persistenceConfig = createPersistenceConfig(env);

async function exportData() {
  console.log("📤 Exporting persistence data...");

  try {
    const provider = createPersistenceProvider(persistenceConfig);
    const data = await provider.load();
    console.log(JSON.stringify(data, null, 2));
    await provider.close();
    console.log("✅ Data exported successfully");
  } catch (error) {
    console.error("❌ Export failed:", (error as Error).message);
    process.exit(1);
  }
}

exportData();
