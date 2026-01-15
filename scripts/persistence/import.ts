#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createJsonPersistenceProvider } from "../../src/store/persistence/json-provider";

const DB_PATH = join(homedir(), ".toad", "toad.db");

async function importData() {
  console.log("📥 Importing persistence data...");

  try {
    // Read JSON from stdin
    const input = readFileSync(0, "utf-8");
    const data = JSON.parse(input);

    // For now, assume JSON provider for import
    // TODO: Detect current provider from config
    const provider = createJsonPersistenceProvider({
      filePath: DB_PATH.replace(".db", ".json"),
    });

    await provider.save(data);
    console.log("✅ Data imported successfully");
  } catch (error) {
    console.error("❌ Import failed:", (error as Error).message);
    process.exit(1);
  }
}

importData();
