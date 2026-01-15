#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createJsonPersistenceProvider } from "../../src/store/persistence/json-provider";

const DB_PATH = join(homedir(), ".toad", "toad.db");

async function exportData() {
  console.log("📤 Exporting persistence data...");

  // For now, assume JSON provider for export
  // TODO: Detect current provider from config
  const provider = createJsonPersistenceProvider({
    filePath: DB_PATH.replace(".db", ".json"),
  });

  try {
    const data = await provider.load();
    console.log(JSON.stringify(data, null, 2));
    console.log("✅ Data exported successfully");
  } catch (error) {
    console.error("❌ Export failed:", (error as Error).message);
    process.exit(1);
  }
}

exportData();
