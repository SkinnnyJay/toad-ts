import {
  sortCloudAgentItemsByRecency,
  toSortableCloudTimestamp,
} from "@/ui/utils/cloud-agent-list";
import { describe, expect, it } from "vitest";

describe("cloud-agent-list", () => {
  it("converts optional timestamps to sortable numbers", () => {
    expect(toSortableCloudTimestamp(undefined)).toBe(-1);
    expect(toSortableCloudTimestamp("not-a-date")).toBe(-1);
    expect(toSortableCloudTimestamp("2026-02-11T10:00:00.000Z")).toBeGreaterThan(0);
  });

  it("sorts cloud agents by recency then id", () => {
    const sorted = sortCloudAgentItemsByRecency([
      { id: "agent-b", updatedAt: "2026-02-11T10:00:00.000Z" },
      { id: "agent-a", updatedAt: "2026-02-11T10:00:00.000Z" },
      { id: "agent-c", updatedAt: "2026-02-10T10:00:00.000Z" },
      { id: "agent-z" },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["agent-a", "agent-b", "agent-c", "agent-z"]);
  });
});
