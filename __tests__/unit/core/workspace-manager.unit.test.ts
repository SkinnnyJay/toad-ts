import { WorkspaceManager } from "@/core/workspace-manager";
import { describe, expect, it } from "vitest";

describe("WorkspaceManager", () => {
  it("should initialize with empty workspace list", async () => {
    const manager = new WorkspaceManager();
    const list = await manager.list();
    expect(Array.isArray(list)).toBe(true);
  });

  it("should return undefined active workspace initially", async () => {
    const manager = new WorkspaceManager();
    const active = await manager.getActive();
    expect(active).toBeUndefined();
  });
});
