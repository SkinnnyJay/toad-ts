import { SESSION_MODE } from "@/constants/session-modes";
import { type Session, SessionIdSchema } from "@/types/domain";
import {
  toNormalizedOptionalString,
  withSessionAvailableModels,
  withSessionModel,
} from "@/ui/utils/session-model-metadata";
import { describe, expect, it } from "vitest";

const createBaseSession = (): Session => ({
  id: SessionIdSchema.parse("session-model-utils"),
  title: "Session",
  messageIds: [],
  createdAt: 1,
  updatedAt: 1,
  mode: SESSION_MODE.AUTO,
  metadata: {
    mcpServers: [],
    compactionSessionId: SessionIdSchema.parse("compaction-id"),
    compactionSummary: "Compaction summary",
  },
});

describe("session-model-metadata", () => {
  it("normalizes optional strings", () => {
    expect(toNormalizedOptionalString("  gpt-5  ")).toBe("gpt-5");
    expect(toNormalizedOptionalString("   ")).toBeUndefined();
    expect(toNormalizedOptionalString(undefined)).toBeUndefined();
  });

  it("updates session model while preserving metadata", () => {
    const session = createBaseSession();
    const updated = withSessionModel(session, "gpt-5");

    expect(updated.metadata).toEqual({
      mcpServers: [],
      compactionSessionId: SessionIdSchema.parse("compaction-id"),
      compactionSummary: "Compaction summary",
      model: "gpt-5",
    });
  });

  it("hydrates available models and seeds fallback model when current is blank", () => {
    const session = {
      ...createBaseSession(),
      metadata: {
        ...createBaseSession().metadata,
        model: "   ",
      },
    };
    const updated = withSessionAvailableModels(session, {
      availableModels: [
        { modelId: "auto", name: "Auto" },
        { modelId: "fast", name: "Fast" },
      ],
      fallbackModelId: "auto",
    });

    expect(updated.metadata).toEqual({
      mcpServers: [],
      compactionSessionId: SessionIdSchema.parse("compaction-id"),
      compactionSummary: "Compaction summary",
      model: "auto",
      availableModels: [
        { modelId: "auto", name: "Auto" },
        { modelId: "fast", name: "Fast" },
      ],
    });
  });

  it("preserves existing non-blank model over fallback model", () => {
    const session = {
      ...createBaseSession(),
      metadata: {
        ...createBaseSession().metadata,
        model: "gpt-5",
      },
    };
    const updated = withSessionAvailableModels(session, {
      availableModels: [{ modelId: "auto", name: "Auto" }],
      fallbackModelId: "auto",
    });

    expect(updated.metadata?.model).toBe("gpt-5");
  });
});
