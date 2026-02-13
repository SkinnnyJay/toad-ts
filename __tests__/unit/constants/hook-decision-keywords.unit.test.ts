import { HOOK_DECISION_KEYWORD } from "@/constants/hook-decision-keywords";
import { describe, expect, it } from "vitest";

describe("hook decision keyword constants", () => {
  it("exports expected decision tokens", () => {
    expect(HOOK_DECISION_KEYWORD).toEqual({
      ALLOW: "allow",
      APPROVE: "approve",
      DENY: "deny",
      BLOCK: "block",
      YES: "yes",
      NO: "no",
    });
  });
});
