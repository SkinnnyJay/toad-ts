import { LIMIT } from "@/config/limits";
import { createClassLogger } from "@/utils/logging/logger.utils";

const logger = createClassLogger("PromptCache");

const DEFAULT_MAX_ENTRIES = LIMIT.PROMPT_CACHE_MAX_ENTRIES;
const DEFAULT_TTL_MS = LIMIT.PROMPT_CACHE_TTL_MS;

interface CacheEntry {
  key: string;
  suggestions: string[];
  createdAt: number;
}

/**
 * LRU cache for prompt suggestions to minimize redundant LLM calls.
 * When the same conversation context produces suggestions, they're cached
 * and reused until the context changes or the TTL expires.
 */
export class PromptCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES, ttlMs = DEFAULT_TTL_MS) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /**
   * Generate a cache key from conversation context.
   * Uses the last N messages' content hash.
   */
  generateKey(context: string): string {
    // Simple hash: sum of char codes mod a large prime
    let hash = 0;
    for (let i = 0; i < context.length; i++) {
      const char = context.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return `prompt-${hash.toString(36)}`;
  }

  get(key: string): string[] | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.suggestions;
  }

  set(key: string, suggestions: string[]): void {
    // Evict oldest if at capacity
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
      }
    }

    this.entries.set(key, {
      key,
      suggestions,
      createdAt: Date.now(),
    });
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  /**
   * Prune expired entries.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.entries) {
      if (now - entry.createdAt > this.ttlMs) {
        this.entries.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) {
      logger.info("Pruned prompt cache", { pruned, remaining: this.entries.size });
    }
    return pruned;
  }
}
