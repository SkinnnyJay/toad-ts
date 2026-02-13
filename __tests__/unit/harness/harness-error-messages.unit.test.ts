import {
  formatHarnessAdapterNotRegisteredError,
  formatHarnessNotConfiguredError,
  formatHarnessNotFoundError,
  formatInvalidHarnessIdError,
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

  it("formats harness not found message", () => {
    expect(formatHarnessNotFoundError("cursor-cli")).toBe("Harness 'cursor-cli' not found.");
  });

  it("formats invalid harness id message", () => {
    expect(formatInvalidHarnessIdError(" cursor-cli ")).toBe(
      "Invalid harness id ' cursor-cli '. Harness ids must not contain leading or trailing whitespace."
    );
  });
});
