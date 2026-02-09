import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";
import { SIDEBAR_TAB } from "@/constants/sidebar-tabs";

import { AppStateSchema } from "@/types/domain";
import { z } from "zod";

export const SessionSnapshotSchema = AppStateSchema.omit({ connectionStatus: true });
export type SessionSnapshot = z.infer<typeof SessionSnapshotSchema>;

export interface SessionPersistence {
  load(): Promise<SessionSnapshot>;
  save(snapshot: SessionSnapshot): Promise<void>;
}

export interface DiskSessionPersistenceOptions {
  filePath: string;
}

const diskOptionsSchema = z.object({ filePath: z.string().min(1) });

const defaultSnapshot: SessionSnapshot = SessionSnapshotSchema.parse({
  currentSessionId: undefined,
  sessions: {},
  messages: {},
  plans: {},
  contextAttachments: {},
  uiState: {
    sidebarTab: SIDEBAR_TAB.FILES,
    accordionCollapsed: {},
    showToolDetails: true,
    showThinking: true,
  },
});

const normalizeSnapshot = (snapshot?: SessionSnapshot): SessionSnapshot => {
  if (!snapshot) {
    return defaultSnapshot;
  }
  return SessionSnapshotSchema.parse(snapshot);
};

const cloneSnapshot = (snapshot: SessionSnapshot): SessionSnapshot =>
  SessionSnapshotSchema.parse(snapshot);

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error;
}

const readSnapshotFile = async (filePath: string): Promise<SessionSnapshot> => {
  try {
    const content = await readFile(filePath, ENCODING.UTF8);
    if (!content.trim()) {
      return cloneSnapshot(defaultSnapshot);
    }
    const parsed: unknown = JSON.parse(content);
    return SessionSnapshotSchema.parse(parsed);
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return cloneSnapshot(defaultSnapshot);
    }
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return cloneSnapshot(defaultSnapshot);
    }
    throw error;
  }
};

export const createMemorySessionPersistence = (initial?: SessionSnapshot): SessionPersistence => {
  let snapshot = normalizeSnapshot(initial);

  return {
    async load() {
      return cloneSnapshot(snapshot);
    },

    async save(nextSnapshot) {
      snapshot = normalizeSnapshot(nextSnapshot);
    },
  };
};

export const createDiskSessionPersistence = (
  options: DiskSessionPersistenceOptions
): SessionPersistence => {
  const config = diskOptionsSchema.parse(options);

  return {
    async load() {
      return readSnapshotFile(config.filePath);
    },

    async save(snapshot) {
      const normalized = normalizeSnapshot(snapshot);
      await mkdir(dirname(config.filePath), { recursive: true });
      await writeFile(config.filePath, JSON.stringify(normalized, null, 2), ENCODING.UTF8);
    },
  };
};

export { defaultSnapshot };
