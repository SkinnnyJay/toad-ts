import { ENV_KEY } from "@/constants/env-keys";
import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { describe, expect, it } from "vitest";

describe("default harness config", () => {
  it("includes cursor harness by default", () => {
    const result = createDefaultHarnessConfig({});

    expect(result.harnesses[HARNESS_DEFAULT.CURSOR_CLI_ID]).toEqual(
      expect.objectContaining({
        id: HARNESS_DEFAULT.CURSOR_CLI_ID,
        name: HARNESS_DEFAULT.CURSOR_CLI_NAME,
      })
    );
  });

  it("omits cursor harness when TOADSTOOL_CURSOR_CLI_ENABLED is false", () => {
    const result = createDefaultHarnessConfig({
      [ENV_KEY.TOADSTOOL_CURSOR_CLI_ENABLED]: "false",
    });

    expect(result.harnesses[HARNESS_DEFAULT.CURSOR_CLI_ID]).toBeUndefined();
  });

  it("uses overridden cursor command and args when provided", () => {
    const result = createDefaultHarnessConfig({
      [ENV_KEY.TOADSTOOL_CURSOR_COMMAND]: "cursor-agent-custom",
      [ENV_KEY.TOADSTOOL_CURSOR_ARGS]: "--fast --json",
    });

    expect(result.harnesses[HARNESS_DEFAULT.CURSOR_CLI_ID]).toEqual(
      expect.objectContaining({
        command: "cursor-agent-custom",
        args: ["--fast", "--json"],
      })
    );
  });
});
