import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnalyticsTelemetryStorage } from "../../../src/utils/token-optimizer/analyticsTelemetryStorage";
import { createJsonTelemetryStorage } from "../../../src/utils/token-optimizer/telemetryStorage";
import type { AnalyticsSnapshot } from "../../../src/utils/token-optimizer/tokenOptimizer.types";

describe("TelemetryStorage", () => {
  const tempDir = join(process.cwd(), ".test-temp");
  const testFilePath = join(tempDir, "telemetry.json");

  beforeEach(async () => {
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createJsonTelemetryStorage", () => {
    it("should persist snapshot to file", async () => {
      const storage = createJsonTelemetryStorage({ filePath: testFilePath });
      const snapshot: AnalyticsSnapshot = {
        metricsBefore: {
          rawPromptText: "test",
          rawPromptCharCount: 4,
          rawPromptTokenCount: 1,
          rawPromptByteSize: 4,
        },
        metricsAfter: {
          optimizedPromptText: "test",
          optimizedPromptCharCount: 4,
          optimizedPromptTokenCount: 1,
          optimizedPromptByteSize: 4,
        },
        savings: {
          compressionRatio: 1,
          tokensSaved: 0,
          bytesSaved: 0,
          percentReductionTokens: 0,
          percentReductionBytes: 0,
          estimatedCostSavingsUsd: 0,
        },
        context: {
          contextMessagesSelectedCount: 0,
          contextMessagesRemovedCount: 0,
          contextTokensSelected: 0,
          contextTokensRemoved: 0,
          contextPrunedPercentage: 0,
          memorySummaryTokens: 0,
          memorySummarySavingsTokens: 0,
          retrievalChunksSelected: 0,
          retrievalHitRate: 0,
        },
        output: {
          completionTokens: 0,
          tokensPerSecond: 0,
          latencyMs: 0,
          promptToOutputRatio: 0,
        },
        cost: {
          providerName: "test",
          modelName: "test",
          providerTokenPricePrompt: 0,
          providerTokenPriceCompletion: 0,
          promptCostUsd: 0,
          completionCostUsd: 0,
          totalCostUsd: 0,
          contextWindowUtilization: 0,
        },
        meta: {
          timestampUtc: new Date().toISOString(),
          optimizerVersion: "1.0.0",
          requestId: "test-1",
        },
      };

      await storage.persistSnapshot(snapshot);

      const content = await readFile(testFilePath, "utf-8");
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0]?.meta.requestId).toBe("test-1");
    });

    it("should fetch recent snapshots", async () => {
      const storage = createJsonTelemetryStorage({ filePath: testFilePath });
      const snapshot1: AnalyticsSnapshot = {
        metricsBefore: {
          rawPromptText: "test1",
          rawPromptCharCount: 5,
          rawPromptTokenCount: 1,
          rawPromptByteSize: 5,
        },
        metricsAfter: {
          optimizedPromptText: "test1",
          optimizedPromptCharCount: 5,
          optimizedPromptTokenCount: 1,
          optimizedPromptByteSize: 5,
        },
        savings: {
          compressionRatio: 1,
          tokensSaved: 0,
          bytesSaved: 0,
          percentReductionTokens: 0,
          percentReductionBytes: 0,
          estimatedCostSavingsUsd: 0,
        },
        context: {
          contextMessagesSelectedCount: 0,
          contextMessagesRemovedCount: 0,
          contextTokensSelected: 0,
          contextTokensRemoved: 0,
          contextPrunedPercentage: 0,
          memorySummaryTokens: 0,
          memorySummarySavingsTokens: 0,
          retrievalChunksSelected: 0,
          retrievalHitRate: 0,
        },
        output: {
          completionTokens: 0,
          tokensPerSecond: 0,
          latencyMs: 0,
          promptToOutputRatio: 0,
        },
        cost: {
          providerName: "test",
          modelName: "test",
          providerTokenPricePrompt: 0,
          providerTokenPriceCompletion: 0,
          promptCostUsd: 0,
          completionCostUsd: 0,
          totalCostUsd: 0,
          contextWindowUtilization: 0,
        },
        meta: {
          timestampUtc: new Date().toISOString(),
          optimizerVersion: "1.0.0",
          requestId: "test-1",
        },
      };

      const snapshot2: AnalyticsSnapshot = {
        ...snapshot1,
        meta: { ...snapshot1.meta, requestId: "test-2" },
      };

      await storage.persistSnapshot(snapshot1);
      await storage.persistSnapshot(snapshot2);

      const recent = await storage.fetchRecent(1);
      expect(recent.length).toBe(1);
      expect(recent[0]?.meta.requestId).toBe("test-2");
    });

    it("should purge all snapshots", async () => {
      const storage = createJsonTelemetryStorage({ filePath: testFilePath });
      const snapshot: AnalyticsSnapshot = {
        metricsBefore: {
          rawPromptText: "test",
          rawPromptCharCount: 4,
          rawPromptTokenCount: 1,
          rawPromptByteSize: 4,
        },
        metricsAfter: {
          optimizedPromptText: "test",
          optimizedPromptCharCount: 4,
          optimizedPromptTokenCount: 1,
          optimizedPromptByteSize: 4,
        },
        savings: {
          compressionRatio: 1,
          tokensSaved: 0,
          bytesSaved: 0,
          percentReductionTokens: 0,
          percentReductionBytes: 0,
          estimatedCostSavingsUsd: 0,
        },
        context: {
          contextMessagesSelectedCount: 0,
          contextMessagesRemovedCount: 0,
          contextTokensSelected: 0,
          contextTokensRemoved: 0,
          contextPrunedPercentage: 0,
          memorySummaryTokens: 0,
          memorySummarySavingsTokens: 0,
          retrievalChunksSelected: 0,
          retrievalHitRate: 0,
        },
        output: {
          completionTokens: 0,
          tokensPerSecond: 0,
          latencyMs: 0,
          promptToOutputRatio: 0,
        },
        cost: {
          providerName: "test",
          modelName: "test",
          providerTokenPricePrompt: 0,
          providerTokenPriceCompletion: 0,
          promptCostUsd: 0,
          completionCostUsd: 0,
          totalCostUsd: 0,
          contextWindowUtilization: 0,
        },
        meta: {
          timestampUtc: new Date().toISOString(),
          optimizerVersion: "1.0.0",
          requestId: "test-1",
        },
      };

      await storage.persistSnapshot(snapshot);
      await storage.purge();

      const recent = await storage.fetchRecent();
      expect(recent.length).toBe(0);
    });
  });

  describe("createAnalyticsTelemetryStorage", () => {
    it("should bridge to analytics service", async () => {
      const mockAnalytics = {
        trackTokenOptimization: vi.fn().mockResolvedValue(undefined),
      };

      const storage = createAnalyticsTelemetryStorage({
        analyticsService: mockAnalytics as never,
        compressionType: "JSON",
        agentId: "agent-1",
        chatId: "chat-1",
      });

      const snapshot: AnalyticsSnapshot = {
        metricsBefore: {
          rawPromptText: "test",
          rawPromptCharCount: 4,
          rawPromptTokenCount: 1,
          rawPromptByteSize: 4,
        },
        metricsAfter: {
          optimizedPromptText: "test",
          optimizedPromptCharCount: 4,
          optimizedPromptTokenCount: 1,
          optimizedPromptByteSize: 4,
        },
        savings: {
          compressionRatio: 1,
          tokensSaved: 0,
          bytesSaved: 0,
          percentReductionTokens: 0,
          percentReductionBytes: 0,
          estimatedCostSavingsUsd: 0,
        },
        context: {
          contextMessagesSelectedCount: 0,
          contextMessagesRemovedCount: 0,
          contextTokensSelected: 0,
          contextTokensRemoved: 0,
          contextPrunedPercentage: 0,
          memorySummaryTokens: 0,
          memorySummarySavingsTokens: 0,
          retrievalChunksSelected: 0,
          retrievalHitRate: 0,
        },
        output: {
          completionTokens: 0,
          tokensPerSecond: 0,
          latencyMs: 0,
          promptToOutputRatio: 0,
        },
        cost: {
          providerName: "test",
          modelName: "test",
          providerTokenPricePrompt: 0,
          providerTokenPriceCompletion: 0,
          promptCostUsd: 0,
          completionCostUsd: 0,
          totalCostUsd: 0,
          contextWindowUtilization: 0,
        },
        meta: {
          timestampUtc: new Date().toISOString(),
          optimizerVersion: "1.0.0",
          requestId: "test-1",
        },
      };

      await storage.persistSnapshot(snapshot);

      expect(mockAnalytics.trackTokenOptimization).toHaveBeenCalledWith(snapshot, {
        compressionType: "JSON",
        agentId: "agent-1",
        chatId: "chat-1",
      });
    });

    it("should use fallback storage when configured", async () => {
      const mockAnalytics = {
        trackTokenOptimization: vi.fn().mockResolvedValue(undefined),
      };

      const fallbackStorage = createJsonTelemetryStorage({ filePath: testFilePath });
      const storage = createAnalyticsTelemetryStorage({
        analyticsService: mockAnalytics as never,
        fallbackStorage,
      });

      const snapshot: AnalyticsSnapshot = {
        metricsBefore: {
          rawPromptText: "test",
          rawPromptCharCount: 4,
          rawPromptTokenCount: 1,
          rawPromptByteSize: 4,
        },
        metricsAfter: {
          optimizedPromptText: "test",
          optimizedPromptCharCount: 4,
          optimizedPromptTokenCount: 1,
          optimizedPromptByteSize: 4,
        },
        savings: {
          compressionRatio: 1,
          tokensSaved: 0,
          bytesSaved: 0,
          percentReductionTokens: 0,
          percentReductionBytes: 0,
          estimatedCostSavingsUsd: 0,
        },
        context: {
          contextMessagesSelectedCount: 0,
          contextMessagesRemovedCount: 0,
          contextTokensSelected: 0,
          contextTokensRemoved: 0,
          contextPrunedPercentage: 0,
          memorySummaryTokens: 0,
          memorySummarySavingsTokens: 0,
          retrievalChunksSelected: 0,
          retrievalHitRate: 0,
        },
        output: {
          completionTokens: 0,
          tokensPerSecond: 0,
          latencyMs: 0,
          promptToOutputRatio: 0,
        },
        cost: {
          providerName: "test",
          modelName: "test",
          providerTokenPricePrompt: 0,
          providerTokenPriceCompletion: 0,
          promptCostUsd: 0,
          completionCostUsd: 0,
          totalCostUsd: 0,
          contextWindowUtilization: 0,
        },
        meta: {
          timestampUtc: new Date().toISOString(),
          optimizerVersion: "1.0.0",
          requestId: "test-1",
        },
      };

      await storage.persistSnapshot(snapshot);

      // Should be in fallback storage
      const recent = await storage.fetchRecent();
      expect(recent.length).toBe(1);
    });
  });
});
