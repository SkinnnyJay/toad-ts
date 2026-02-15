import { parseBooleanEnvFlag } from "@/utils/env/boolean-flags";
import { describe, expect, it } from "vitest";

describe("parseBooleanEnvFlag", () => {
  it("returns undefined for undefined input", () => {
    expect(parseBooleanEnvFlag(undefined)).toBeUndefined();
  });

  it.each(["true", " true ", "1", " TRUE "] as const)(
    "returns true for truthy env flag %s",
    (value) => {
      expect(parseBooleanEnvFlag(value)).toBe(true);
    }
  );

  it.each(["false", " false ", "0", " FALSE "] as const)(
    "returns false for falsey env flag %s",
    (value) => {
      expect(parseBooleanEnvFlag(value)).toBe(false);
    }
  );

  it.each(["", "   ", "yes", "no", "2"] as const)(
    "returns undefined for unsupported env flag %s",
    (value) => {
      expect(parseBooleanEnvFlag(value)).toBeUndefined();
    }
  );
});
