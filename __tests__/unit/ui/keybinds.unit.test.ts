import { KEYBIND_ACTION } from "@/constants/keybind-actions";
import {
  createKeybindRuntime,
  isActionTriggered,
  isLeaderKey,
  parseKeyChord,
} from "@/ui/keybinds/keybinds";
import { describe, expect, it } from "vitest";

describe("keybinds", () => {
  it("parses key chords with modifiers", () => {
    const chord = parseKeyChord("ctrl+shift+f");
    expect(chord).toEqual({
      key: "f",
      ctrl: true,
      meta: false,
      alt: false,
      shift: true,
    });
  });

  it("handles leader key activation and actions", () => {
    const runtime = createKeybindRuntime({
      leader: "ctrl+x",
      bindings: {
        [KEYBIND_ACTION.SESSION_CHILD_CYCLE]: "<<leader>right",
      },
    });

    const leaderKey = { name: "x", ctrl: true, meta: false, shift: false, option: false };
    const rightKey = { name: "right", ctrl: false, meta: false, shift: false, option: false };

    expect(isLeaderKey(leaderKey, runtime)).toBe(true);
    expect(isActionTriggered(rightKey, runtime, KEYBIND_ACTION.SESSION_CHILD_CYCLE, true)).toBe(
      true
    );
    expect(isActionTriggered(rightKey, runtime, KEYBIND_ACTION.SESSION_CHILD_CYCLE, false)).toBe(
      false
    );
  });
});
