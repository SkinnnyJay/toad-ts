#!/usr/bin/env tsx

import { unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DB_PATH = join(homedir(), ".toad", "toad.db");

async function clearDatabase() {
  try {
    await unlink(DB_PATH);
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
