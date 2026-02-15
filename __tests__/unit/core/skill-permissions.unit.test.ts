import { isSkillAllowed, resolveSkillPermission } from "@/core/cross-tool/skill-permissions";
import { describe, expect, it } from "vitest";

describe("skill permissions", () => {
  it("resolves exact and wildcard rules", () => {
    const config = {
      rules: {
        "security-*": "deny" as const,
        planner: "ask" as const,
      },
    };

    expect(resolveSkillPermission("security-review", config)).toBe("deny");
    expect(resolveSkillPermission("planner", config)).toBe("ask");
  });

  it("treats wildcard pattern as match-all", () => {
    const config = {
      rules: {
        "*": "deny" as const,
      },
    };

    expect(resolveSkillPermission("any-skill", config)).toBe("deny");
    expect(isSkillAllowed("any-skill", config)).toBe(false);
  });

  it("defaults to allow when no rule matches", () => {
    const config = {
      rules: {},
    };

    expect(resolveSkillPermission("unknown", config)).toBe("allow");
    expect(isSkillAllowed("unknown", config)).toBe(true);
  });
});
