import { PERSISTENCE_WRITE_MODE } from "@/constants/persistence-write-modes";
import { createClassLogger } from "@/utils/logging/logger.utils";
import type { StoreApi } from "zustand";

import type { AppStore } from "@/store/app-store";
import { SessionSnapshotSchema } from "@/store/session-persistence";
import type { SessionSnapshot } from "@/store/session-persistence";
import type { AppState, Message } from "@/types/domain";
import type { PersistenceProvider } from "./persistence-provider";

export interface PersistenceManagerOptions {
  writeMode:
    | typeof PERSISTENCE_WRITE_MODE.PER_TOKEN
    | typeof PERSISTENCE_WRITE_MODE.PER_MESSAGE
    | typeof PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE;
  batchDelay: number;
}

interface SnapshotMetrics {
  messageCount: number;
  streamingCount: number;
  currentSessionId?: string;
}

const buildSnapshot = (state: AppState): SessionSnapshot => {
  return SessionSnapshotSchema.parse({
    currentSessionId: state.currentSessionId,
    sessions: state.sessions,
    messages: state.messages,
  });
};

const computeMetrics = (snapshot: SessionSnapshot): SnapshotMetrics => {
  const messages = Object.values(snapshot.messages) as Message[];
  const streamingCount = messages.filter((message) => message.isStreaming).length;
  return {
    messageCount: messages.length,
    streamingCount,
    currentSessionId: snapshot.currentSessionId,
  };
};

export class PersistenceManager {
  private unsubscribe: (() => void) | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastMetrics: SnapshotMetrics | null = null;
  private readonly logger = createClassLogger("PersistenceManager");

  constructor(
    private readonly store: StoreApi<AppStore>,
    private readonly provider: PersistenceProvider,
    private readonly options: PersistenceManagerOptions
  ) {}

  async hydrate(): Promise<void> {
    const snapshot = await this.provider.load();
    this.store.getState().hydrate(snapshot);
    this.lastMetrics = computeMetrics(snapshot);
  }

  start(): void {
    if (this.unsubscribe) {
      return;
    }

    this.unsubscribe = this.store.subscribe((state: AppState) => {
      const snapshot = buildSnapshot(state);
      if (!this.shouldPersist(snapshot)) {
        return;
      }
      this.scheduleSave();
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  async close(): Promise<void> {
    this.stop();
    await this.provider.close();
  }

  private shouldPersist(snapshot: SessionSnapshot): boolean {
    const metrics = computeMetrics(snapshot);
    const lastMetrics = this.lastMetrics;
    this.lastMetrics = metrics;

    if (!lastMetrics) {
      return true;
    }

    switch (this.options.writeMode) {
      case PERSISTENCE_WRITE_MODE.PER_TOKEN:
        return true;
      case PERSISTENCE_WRITE_MODE.PER_MESSAGE:
        return (
          metrics.messageCount !== lastMetrics.messageCount ||
          metrics.streamingCount < lastMetrics.streamingCount
        );
      case PERSISTENCE_WRITE_MODE.ON_SESSION_CHANGE:
        return metrics.currentSessionId !== lastMetrics.currentSessionId;
      default:
        return true;
    }
  }

  private scheduleSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const snapshot = buildSnapshot(this.store.getState());
      void this.persistSnapshot(snapshot);
    }, this.options.batchDelay);
  }

  private async persistSnapshot(snapshot: SessionSnapshot): Promise<void> {
    try {
      await this.provider.save(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to persist session snapshot", { error: message });
    }
  }
}
