import { describe, expect, it } from "vitest";

import { parseBooleanEnvValue, parseNumberEnvValue } from "../../../src/utils/env/env.utils";

describe("env.utils", (): void => {
  it("parses numbers safely", (): void => {
    expect(parseNumberEnvValue("123", 0)).toBe(123);
    expect(parseNumberEnvValue("nope", 7)).toBe(7);
  });

  it("parses booleans safely", (): void => {
    expect(parseBooleanEnvValue("true", false)).toBe(true);
    expect(parseBooleanEnvValue("1", false)).toBe(true);
    expect(parseBooleanEnvValue("false", true)).toBe(false);
    expect(parseBooleanEnvValue("0", true)).toBe(false);
  });
});
