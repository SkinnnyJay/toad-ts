import { SETTINGS_TAB, SETTINGS_TAB_VALUES } from "@/constants/settings-tabs";
import { describe, expect, it } from "vitest";

describe("settings-tabs constants", () => {
  it("includes model tab in ordered values", () => {
    expect(SETTINGS_TAB.MODEL).toBe("model");
    expect(SETTINGS_TAB_VALUES).toEqual([
      SETTINGS_TAB.DEFAULT_PROVIDER,
      SETTINGS_TAB.MODEL,
      SETTINGS_TAB.KEYBINDS,
    ]);
  });
});
