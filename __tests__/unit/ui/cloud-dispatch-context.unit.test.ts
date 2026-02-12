import {
  toCloudDispatchContextFromRepoWorkflow,
  toNormalizedCloudDispatchContextValue,
} from "@/ui/utils/cloud-dispatch-context";
import { describe, expect, it } from "vitest";

describe("cloud-dispatch-context", () => {
  it("normalizes blank and unknown values to undefined", () => {
    expect(toNormalizedCloudDispatchContextValue("")).toBeUndefined();
    expect(toNormalizedCloudDispatchContextValue("   ")).toBeUndefined();
    expect(toNormalizedCloudDispatchContextValue("unknown")).toBeUndefined();
    expect(toNormalizedCloudDispatchContextValue("UNKNOWN")).toBeUndefined();
    expect(toNormalizedCloudDispatchContextValue("main")).toBe("main");
  });

  it("builds repository slug with owner and repo name", () => {
    expect(
      toCloudDispatchContextFromRepoWorkflow({
        owner: "toadstool",
        repoName: "toad-ts",
        branch: "feature/cloud-dispatch",
      })
    ).toEqual({
      repository: "toadstool/toad-ts",
      branch: "feature/cloud-dispatch",
    });
  });

  it("falls back to repo name when owner is unknown", () => {
    expect(
      toCloudDispatchContextFromRepoWorkflow({
        owner: "unknown",
        repoName: "toad-ts",
        branch: "main",
      })
    ).toEqual({
      repository: "toad-ts",
      branch: "main",
    });
  });

  it("returns undefined when no context values are usable", () => {
    expect(
      toCloudDispatchContextFromRepoWorkflow({
        owner: "unknown",
        repoName: "unknown",
        branch: "unknown",
      })
    ).toBeUndefined();
  });
});
