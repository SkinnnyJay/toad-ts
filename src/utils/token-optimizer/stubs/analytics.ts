import type { AnalyticsSnapshot } from "../tokenOptimizer.types";

export interface AnalyticsService {
  trackTokenOptimization(
    snapshot: AnalyticsSnapshot,
    context?: {
      compressionType?: string;
      agentId?: string;
      chatId?: string;
    }
  ): Promise<void>;
}

export const analytics: AnalyticsService = {
  async trackTokenOptimization(
    _snapshot: AnalyticsSnapshot,
    _context?: {
      compressionType?: string;
      agentId?: string;
      chatId?: string;
    }
  ): Promise<void> {
    // Stub implementation - no-op
  },
};
