import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { LIMIT } from "@/config/limits";
import { CHECKPOINT_DIRECTION, type CheckpointDirection } from "@/constants/checkpoint-direction";
import { CHECKPOINT, SNAPSHOT_TARGET, type SnapshotTarget } from "@/constants/checkpoints";
import { ENCODING } from "@/constants/encodings";
import { FILE_PATH } from "@/constants/file-paths";
import { INDENT_SPACES } from "@/constants/json-format";
import { REWIND_MODE, type RewindMode } from "@/constants/rewind-modes";
import type { AppStore } from "@/store/app-store";
import {
  type Checkpoint,
  CheckpointIdSchema,
  CheckpointSchema,
  type CheckpointSnapshot,
  CheckpointSnapshotSchema,
  type FileChange,
  type Message,
  MessageSchema,
  type Plan,
  PlanSchema,
  type SessionId,
  SessionSchema,
} from "@/types/domain";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { nanoid } from "nanoid";
import type { StoreApi } from "zustand";
import { applyGitPatches, buildPatches, getGitRoot } from "./checkpoint-git";

export interface CheckpointSummary {
  id: Checkpoint["id"];
  createdAt: number;
  prompt?: string;
  fileChanges: number;
}

export interface RewindResult {
  checkpoint: Checkpoint;
  mode: RewindMode;
  direction: CheckpointDirection;
}

export interface CheckpointStatus {
  cursor: number;
  total: number;
}

interface CheckpointDraft {
  id: Checkpoint["id"];
  sessionId: SessionId;
  prompt?: string;
  createdAt: number;
  before: CheckpointSnapshot;
  fileChanges: Map<string, FileChange>;
}

const retentionMs = LIMIT.CHECKPOINT_RETENTION_DAYS * LIMIT.DAY_MS;

const resolveCheckpointDir = (sessionId: SessionId): string =>
  path.join(homedir(), FILE_PATH.TOADSTOOL_DIR, FILE_PATH.CHECKPOINTS_DIR, sessionId);

const buildCheckpointFileName = (checkpointId: Checkpoint["id"]): string =>
  `${checkpointId}${CHECKPOINT.FILE_EXTENSION}`;

const buildCheckpointPath = (sessionId: SessionId, checkpointId: Checkpoint["id"]): string =>
  path.join(resolveCheckpointDir(sessionId), buildCheckpointFileName(checkpointId));

const resolveMode = (mode: RewindMode): { restoreConversation: boolean; restoreCode: boolean } => {
  if (mode === REWIND_MODE.CODE) {
    return { restoreConversation: false, restoreCode: true };
  }
  if (mode === REWIND_MODE.CONVERSATION) {
    return { restoreConversation: true, restoreCode: false };
  }
  if (mode === REWIND_MODE.SUMMARIZE) {
    return { restoreConversation: true, restoreCode: false };
  }
  return { restoreConversation: true, restoreCode: true };
};

export class CheckpointManager {
  private readonly checkpoints = new Map<SessionId, Checkpoint[]>();
  private readonly cursor = new Map<SessionId, number>();
  private readonly drafts = new Map<SessionId, CheckpointDraft>();
  private readonly logger = createClassLogger("CheckpointManager");
  private readonly listeners = new Set<(sessionId: SessionId) => void>();
  private gitRoot: string | null | undefined;

  constructor(private readonly store: StoreApi<AppStore>) {}

  startCheckpoint(sessionId: SessionId, prompt?: string): Checkpoint["id"] | null {
    const session = this.store.getState().getSession(sessionId);
    if (!session) {
      return null;
    }
    const before = this.buildSnapshot(sessionId);
    const checkpointId = CheckpointIdSchema.parse(
      `${CHECKPOINT.FILE_PREFIX}-${nanoid(LIMIT.NANOID_LENGTH)}`
    );
    const draft: CheckpointDraft = {
      id: checkpointId,
      sessionId,
      prompt,
      createdAt: Date.now(),
      before,
      fileChanges: new Map<string, FileChange>(),
    };
    this.drafts.set(sessionId, draft);
    return checkpointId;
  }

  async finalizeCheckpoint(sessionId: SessionId): Promise<Checkpoint | null> {
    const draft = this.drafts.get(sessionId);
    if (!draft) {
      return null;
    }
    const after = this.buildSnapshot(sessionId);
    const gitRoot = await this.resolveGitRoot();
    const patches = await buildPatches(Array.from(draft.fileChanges.values()), gitRoot);
    const checkpoint = CheckpointSchema.parse({
      id: draft.id,
      sessionId: draft.sessionId,
      prompt: draft.prompt,
      createdAt: draft.createdAt,
      before: draft.before,
      after,
      fileChanges: Array.from(draft.fileChanges.values()),
      patches,
    });
    this.drafts.delete(sessionId);
    await this.persistCheckpoint(checkpoint);
    await this.registerCheckpoint(checkpoint);
    return checkpoint;
  }

  subscribe(listener: (sessionId: SessionId) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getStatus(sessionId: SessionId): Promise<CheckpointStatus> {
    const checkpoints = await this.ensureLoaded(sessionId);
    const cursor = this.cursor.get(sessionId) ?? checkpoints.length;
    return { cursor, total: checkpoints.length };
  }

  recordFileChange(change: FileChange, sessionId?: SessionId): void {
    const effectiveSessionId = sessionId ?? this.store.getState().currentSessionId;
    if (!effectiveSessionId) {
      return;
    }
    const draft = this.drafts.get(effectiveSessionId);
    if (!draft) {
      return;
    }
    const existing = draft.fileChanges.get(change.path);
    if (existing) {
      draft.fileChanges.set(change.path, {
        path: change.path,
        before: existing.before,
        after: change.after,
      });
    } else {
      draft.fileChanges.set(change.path, change);
    }
  }

  async listCheckpoints(sessionId: SessionId): Promise<CheckpointSummary[]> {
    const checkpoints = await this.ensureLoaded(sessionId);
    return checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      createdAt: checkpoint.createdAt,
      prompt: checkpoint.prompt,
      fileChanges: checkpoint.fileChanges.length,
    }));
  }

  async undo(sessionId: SessionId, mode: RewindMode): Promise<RewindResult | null> {
    const checkpoints = await this.ensureLoaded(sessionId);
    const currentCursor = this.cursor.get(sessionId) ?? checkpoints.length;
    if (currentCursor <= 0) {
      return null;
    }
    const nextCursor = currentCursor - 1;
    const checkpoint = checkpoints[nextCursor];
    if (!checkpoint) {
      return null;
    }
    await this.applyCheckpoint(checkpoint, mode, SNAPSHOT_TARGET.BEFORE);
    this.cursor.set(sessionId, nextCursor);
    this.emit(sessionId);
    return { checkpoint, mode, direction: CHECKPOINT_DIRECTION.UNDO };
  }

  async redo(sessionId: SessionId, mode: RewindMode): Promise<RewindResult | null> {
    const checkpoints = await this.ensureLoaded(sessionId);
    const currentCursor = this.cursor.get(sessionId) ?? checkpoints.length;
    if (currentCursor >= checkpoints.length) {
      return null;
    }
    const checkpoint = checkpoints[currentCursor];
    if (!checkpoint) {
      return null;
    }
    await this.applyCheckpoint(checkpoint, mode, SNAPSHOT_TARGET.AFTER);
    this.cursor.set(sessionId, currentCursor + 1);
    this.emit(sessionId);
    return { checkpoint, mode, direction: CHECKPOINT_DIRECTION.REDO };
  }

  async rewind(
    sessionId: SessionId,
    count: number,
    mode: RewindMode
  ): Promise<RewindResult | null> {
    let result: RewindResult | null = null;
    for (let i = 0; i < count; i += 1) {
      const step = await this.undo(sessionId, mode);
      if (!step) {
        break;
      }
      result = step;
    }
    if (result) {
      this.emit(sessionId);
      return { ...result, direction: CHECKPOINT_DIRECTION.REWIND };
    }
    return null;
  }

  async cleanupOldCheckpoints(): Promise<number> {
    const baseDir = path.join(homedir(), FILE_PATH.TOADSTOOL_DIR, FILE_PATH.CHECKPOINTS_DIR);
    let sessionDirs: string[];
    try {
      sessionDirs = await readdir(baseDir);
    } catch {
      return 0;
    }
    let removed = 0;
    const now = Date.now();
    for (const sessionDir of sessionDirs) {
      const dir = path.join(baseDir, sessionDir);
      let entries: string[];
      try {
        entries = await readdir(dir);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.endsWith(CHECKPOINT.FILE_EXTENSION)) continue;
        const filePath = path.join(dir, entry);
        try {
          const raw = await readFile(filePath, ENCODING.UTF8);
          const parsed = JSON.parse(raw) as { createdAt?: number };
          if (parsed.createdAt && now - parsed.createdAt > retentionMs) {
            await rm(filePath);
            removed += 1;
          }
        } catch {
          // Corrupt checkpoint files get cleaned up
          try {
            await rm(filePath);
            removed += 1;
          } catch {
            // ignore
          }
        }
      }
    }
    this.logger.info("Cleaned up old checkpoints", { removed });
    return removed;
  }

  async deleteCheckpoint(sessionId: SessionId, checkpointId: Checkpoint["id"]): Promise<boolean> {
    const checkpoints = await this.ensureLoaded(sessionId);
    const index = checkpoints.findIndex((checkpoint) => checkpoint.id === checkpointId);
    if (index < 0) {
      return false;
    }
    checkpoints.splice(index, 1);
    const cursor = this.cursor.get(sessionId) ?? checkpoints.length;
    const nextCursor = index < cursor ? Math.max(0, cursor - 1) : cursor;
    this.cursor.set(sessionId, nextCursor);
    await this.removeCheckpointFile(sessionId, checkpointId);
    this.emit(sessionId);
    return true;
  }

  private buildSnapshot(sessionId: SessionId): CheckpointSnapshot {
    const state = this.store.getState();
    const session = state.sessions[sessionId];
    if (!session) {
      throw new Error(`Missing session ${sessionId}`);
    }
    const parsedSession = SessionSchema.parse(session);
    const messages: Message[] = [];
    for (const message of Object.values(state.messages)) {
      const parsedMessage = MessageSchema.parse(message);
      if (parsedMessage.sessionId === sessionId) {
        messages.push(parsedMessage);
      }
    }
    let plan: Plan | undefined;
    for (const existing of Object.values(state.plans)) {
      const parsedPlan = PlanSchema.parse(existing);
      if (parsedPlan.sessionId === sessionId) {
        plan = parsedPlan;
        break;
      }
    }
    return CheckpointSnapshotSchema.parse({
      session: parsedSession,
      messages,
      plan,
    });
  }

  private async ensureLoaded(sessionId: SessionId): Promise<Checkpoint[]> {
    const cached = this.checkpoints.get(sessionId);
    if (cached) {
      return cached;
    }
    const loaded = await this.loadCheckpoints(sessionId);
    this.checkpoints.set(sessionId, loaded);
    this.cursor.set(sessionId, loaded.length);
    return loaded;
  }

  private async loadCheckpoints(sessionId: SessionId): Promise<Checkpoint[]> {
    const dir = resolveCheckpointDir(sessionId);
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch (error) {
      return [];
    }
    const now = Date.now();
    const checkpoints: Checkpoint[] = [];
    for (const entry of entries) {
      if (!entry.endsWith(CHECKPOINT.FILE_EXTENSION)) {
        continue;
      }
      const filePath = path.join(dir, entry);
      try {
        const raw = await readFile(filePath, ENCODING.UTF8);
        const parsed = CheckpointSchema.parse(JSON.parse(raw) as unknown);
        if (now - parsed.createdAt > retentionMs) {
          await rm(filePath);
          continue;
        }
        checkpoints.push(parsed);
      } catch (error) {
        this.logger.warn("Failed to load checkpoint", {
          error: error instanceof Error ? error.message : String(error),
          filePath,
        });
      }
    }
    checkpoints.sort((a, b) => a.createdAt - b.createdAt);
    await this.trimCheckpoints(sessionId, checkpoints);
    return checkpoints;
  }

  private async registerCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const checkpoints = await this.ensureLoaded(checkpoint.sessionId);
    const currentCursor = this.cursor.get(checkpoint.sessionId) ?? checkpoints.length;
    if (currentCursor < checkpoints.length) {
      const removed = checkpoints.splice(currentCursor);
      await Promise.all(
        removed.map((entry) => this.removeCheckpointFile(entry.sessionId, entry.id))
      );
    }
    checkpoints.push(checkpoint);
    this.cursor.set(checkpoint.sessionId, checkpoints.length);
    await this.trimCheckpoints(checkpoint.sessionId, checkpoints);
    this.emit(checkpoint.sessionId);
  }

  private emit(sessionId: SessionId): void {
    this.listeners.forEach((listener) => listener(sessionId));
  }

  private async trimCheckpoints(sessionId: SessionId, checkpoints: Checkpoint[]): Promise<void> {
    if (checkpoints.length <= LIMIT.CHECKPOINT_MAX_ENTRIES) {
      return;
    }
    const excess = checkpoints.length - LIMIT.CHECKPOINT_MAX_ENTRIES;
    const removed = checkpoints.splice(0, excess);
    await Promise.all(removed.map((entry) => this.removeCheckpointFile(entry.sessionId, entry.id)));
    const cursor = this.cursor.get(sessionId) ?? checkpoints.length;
    this.cursor.set(sessionId, Math.max(0, cursor - removed.length));
  }

  private async persistCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const dir = resolveCheckpointDir(checkpoint.sessionId);
    await mkdir(dir, { recursive: true });
    const filePath = buildCheckpointPath(checkpoint.sessionId, checkpoint.id);
    await writeFile(filePath, JSON.stringify(checkpoint, null, INDENT_SPACES), ENCODING.UTF8);
  }

  private async removeCheckpointFile(
    sessionId: SessionId,
    checkpointId: Checkpoint["id"]
  ): Promise<void> {
    const filePath = buildCheckpointPath(sessionId, checkpointId);
    try {
      await rm(filePath);
    } catch (error) {
      this.logger.warn("Failed to remove checkpoint file", {
        error: error instanceof Error ? error.message : String(error),
        filePath,
      });
    }
  }

  private async applyCheckpoint(
    checkpoint: Checkpoint,
    mode: RewindMode,
    snapshotTarget: SnapshotTarget
  ): Promise<void> {
    const { restoreConversation, restoreCode } = resolveMode(mode);
    const snapshot =
      snapshotTarget === SNAPSHOT_TARGET.AFTER ? checkpoint.after : checkpoint.before;

    if (restoreCode) {
      const gitRoot = await this.resolveGitRoot();
      const applied = await applyGitPatches(
        checkpoint.patches,
        snapshotTarget === SNAPSHOT_TARGET.BEFORE,
        gitRoot
      );
      if (!applied) {
        const changes = checkpoint.fileChanges;
        await Promise.all(
          changes.map(async (change) => {
            const content = snapshotTarget === SNAPSHOT_TARGET.AFTER ? change.after : change.before;
            if (content === null) {
              await rm(change.path, { force: true });
            } else {
              await mkdir(path.dirname(change.path), { recursive: true });
              await writeFile(change.path, content, ENCODING.UTF8);
            }
          })
        );
      }
    }

    if (restoreConversation || mode === REWIND_MODE.SUMMARIZE) {
      this.store
        .getState()
        .restoreSessionSnapshot(snapshot.session, snapshot.messages, snapshot.plan);
      this.store.getState().setCurrentSession(snapshot.session.id);
    }
  }

  private async resolveGitRoot(): Promise<string | null> {
    if (this.gitRoot !== undefined) return this.gitRoot;
    this.gitRoot = await getGitRoot(undefined);
    return this.gitRoot;
  }
}
