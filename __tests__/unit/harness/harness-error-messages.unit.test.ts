import {
  formatHarnessAdapterNotRegisteredError,
  formatHarnessNotConfiguredError,
} from "@/harness/harness-error-messages";
import { describe, expect, it } from "vitest";

describe("harness error message helpers", () => {
  it("formats harness not configured message", () => {
    expect(formatHarnessNotConfiguredError("cursor-cli")).toBe(
      "Harness 'cursor-cli' not configured."
    );
  });

  it("formats adapter not registered message", () => {
    expect(formatHarnessAdapterNotRegisteredError("cursor-cli")).toBe(
      "Harness adapter 'cursor-cli' not registered."
    );
  });
});
