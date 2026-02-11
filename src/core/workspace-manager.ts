import { readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { z } from "zod";

const logger = createClassLogger("WorkspaceManager");

const WORKSPACE_FILE = "workspaces.json";
const WORKSPACE_DIR = join(homedir(), ".config", "toadstool");

const workspaceEntrySchema = z.object({
  path: z.string(),
  name: z.string().optional(),
  lastAccessed: z.number(),
});

const workspaceStoreSchema = z.object({
  active: z.string().optional(),
  workspaces: z.array(workspaceEntrySchema),
});

type WorkspaceEntry = z.infer<typeof workspaceEntrySchema>;
type WorkspaceStore = z.infer<typeof workspaceStoreSchema>;

const resolveStorePath = (): string => join(WORKSPACE_DIR, WORKSPACE_FILE);

const loadStore = async (): Promise<WorkspaceStore> => {
  const filePath = resolveStorePath();
  try {
    const content = await readFile(filePath, ENCODING.UTF8);
    return workspaceStoreSchema.parse(JSON.parse(content));
  } catch {
    return { workspaces: [] };
  }
};

const saveStore = async (store: WorkspaceStore): Promise<void> => {
  const filePath = resolveStorePath();
  const { mkdir } = await import("node:fs/promises");
  await mkdir(WORKSPACE_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2), ENCODING.UTF8);
};

export class WorkspaceManager {
  private store: WorkspaceStore | null = null;

  async load(): Promise<WorkspaceStore> {
    if (!this.store) {
      this.store = await loadStore();
    }
    return this.store;
  }

  async getActive(): Promise<string | undefined> {
    const store = await this.load();
    return store.active;
  }

  async list(): Promise<WorkspaceEntry[]> {
    const store = await this.load();
    return store.workspaces.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  async add(workspacePath: string, name?: string): Promise<void> {
    const store = await this.load();
    const resolvedPath = resolve(workspacePath);

    // Verify directory exists
    try {
      const pathStat = await stat(resolvedPath);
      if (!pathStat.isDirectory()) {
        throw new Error(`Not a directory: ${resolvedPath}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Not a directory")) throw error;
      throw new Error(`Directory not found: ${resolvedPath}`);
    }

    const existing = store.workspaces.find((w) => w.path === resolvedPath);
    if (existing) {
      existing.lastAccessed = Date.now();
      if (name) existing.name = name;
    } else {
      store.workspaces.push({
        path: resolvedPath,
        name,
        lastAccessed: Date.now(),
      });
    }

    await saveStore(store);
    logger.info("Added workspace", { path: resolvedPath });
  }

  async remove(workspacePath: string): Promise<boolean> {
    const store = await this.load();
    const resolvedPath = resolve(workspacePath);
    const index = store.workspaces.findIndex((w) => w.path === resolvedPath);
    if (index < 0) return false;
    store.workspaces.splice(index, 1);
    if (store.active === resolvedPath) {
      store.active = undefined;
    }
    await saveStore(store);
    logger.info("Removed workspace", { path: resolvedPath });
    return true;
  }

  async setActive(workspacePath: string): Promise<void> {
    const store = await this.load();
    const resolvedPath = resolve(workspacePath);
    const entry = store.workspaces.find((w) => w.path === resolvedPath);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
    store.active = resolvedPath;
    await saveStore(store);
  }
}
