import {
  LLMValidationError,
  aggregateScores,
  assertLLMOutput,
  blocklistCriterion,
  containsFactsCriterion,
  exactMatchCriterion,
  validateLLMOutput,
} from "@/testing/validators/llm-validator";
import { describe, expect, it } from "vitest";

const baseContext = {
  output: "Hello world!",
  expected: "Hello world!",
};

describe("llm-validator", () => {
  it("passes when weighted criteria meet the threshold", () => {
    const result = validateLLMOutput(
      [
        exactMatchCriterion("matches expected", 2),
        blocklistCriterion(["forbidden"], "no blocklist", 1),
      ],
      baseContext,
      { threshold: 0.8 }
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBeCloseTo(1, 5);
    expect(result.scores).toHaveLength(2);
  });

  it("fails when blocklist is present despite other matches", () => {
    const result = validateLLMOutput(
      [exactMatchCriterion(), blocklistCriterion(["world"], "block world", 2)],
      baseContext,
      { threshold: 0.5 }
    );

    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.3333333333333333);
    const blockScore = result.scores.find((score) => score.id === "blocklist");
    expect(blockScore?.score).toBe(0);
  });

  it("calculates partial credit when some facts are present", () => {
    const result = validateLLMOutput(
      [containsFactsCriterion(["hello", "planet", "world"], "facts present", 1)],
      baseContext,
      { threshold: 0.7 }
    );

    expect(result.passed).toBe(false);

    expect(result.score).toBeCloseTo(2 / 3, 5);
    expect(aggregateScores(result.scores)).toBeCloseTo(result.score, 5);
  });

  it("asserts and throws with result details when below threshold", () => {
    const failing = () =>
      assertLLMOutput(
        [exactMatchCriterion("fail", 1)],
        { output: "nope", expected: "yep" },
        {
          threshold: 0.9,
        }
      );

    expect(failing).toThrow(LLMValidationError);
    try {
      failing();
    } catch (error) {
      const err = error as LLMValidationError;
      expect(err.result.passed).toBe(false);
      expect(err.result.score).toBe(0);
    }
  });

  it("asserts and returns result when passing", () => {
    const result = assertLLMOutput(
      [exactMatchCriterion("ok", 1)],
      { output: "match", expected: "match" },
      { threshold: 0.8 }
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });
});
