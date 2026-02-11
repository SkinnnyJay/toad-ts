import { describe, expect, it } from "vitest";
import {
  CursorCloudAgentListResponseSchema,
  CursorCloudAgentResponseSchema,
  CursorCloudConversationResponseSchema,
  CursorCloudModelsResponseSchema,
  CursorCloudRepositoriesResponseSchema,
} from "../../../src/types/cursor-cloud.types";

describe("cursor-cloud types", () => {
  it("normalizes list agent payload variants", () => {
    const listA = CursorCloudAgentListResponseSchema.parse({
      agents: [{ id: "a1", status: "running" }],
      next_cursor: "c2",
    });
    const listB = CursorCloudAgentListResponseSchema.parse({
      data: [{ id: "a2", status: "completed" }],
      cursor: "c3",
    });

    expect(listA.agents[0]?.id).toBe("a1");
    expect(listA.nextCursor).toBe("c2");
    expect(listB.agents[0]?.id).toBe("a2");
    expect(listB.nextCursor).toBe("c3");
  });

  it("normalizes agent and conversation envelopes", () => {
    const agent = CursorCloudAgentResponseSchema.parse({
      agent: { id: "a3", status: "queued" },
    });
    const conversation = CursorCloudConversationResponseSchema.parse({
      conversation: [{ role: "assistant", content: "done" }],
    });

    expect(agent.id).toBe("a3");
    expect(conversation.messages[0]?.content).toBe("done");
  });

  it("normalizes model and repository list envelopes", () => {
    const models = CursorCloudModelsResponseSchema.parse([{ id: "auto" }]);
    const repositories = CursorCloudRepositoriesResponseSchema.parse({
      repositories: [{ name: "owner/repo" }],
    });

    expect(models.models[0]?.id).toBe("auto");
    expect(repositories.repositories[0]?.name).toBe("owner/repo");
  });
});
