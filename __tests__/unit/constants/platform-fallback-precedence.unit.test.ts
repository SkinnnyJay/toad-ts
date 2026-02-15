import { PLATFORM } from "@/constants/platform";
import {
  CLIPBOARD_COMMAND_NAME,
  CLIPBOARD_FALLBACK_PRECEDENCE,
  NUTJS_EXECUTION_FALLBACK_PRECEDENCE,
  NUTJS_EXECUTION_STAGE,
  SOUND_FALLBACK_PRECEDENCE,
} from "@/constants/platform-fallback-precedence";
import { describe, expect, it } from "vitest";

describe("platform fallback precedence constants", () => {
  it("defines clipboard fallback ordering by platform backend", () => {
    expect(CLIPBOARD_FALLBACK_PRECEDENCE.DARWIN).toEqual([CLIPBOARD_COMMAND_NAME.PBCOPY]);
    expect(CLIPBOARD_FALLBACK_PRECEDENCE.WINDOWS).toEqual([CLIPBOARD_COMMAND_NAME.CLIP]);
    expect(CLIPBOARD_FALLBACK_PRECEDENCE.LINUX_WAYLAND).toEqual([CLIPBOARD_COMMAND_NAME.WLCOPY]);
    expect(CLIPBOARD_FALLBACK_PRECEDENCE.LINUX_X11).toEqual([
      CLIPBOARD_COMMAND_NAME.XCLIP,
      CLIPBOARD_COMMAND_NAME.XSEL,
    ]);
  });

  it("defines sound fallback ordering by platform", () => {
    expect(SOUND_FALLBACK_PRECEDENCE[PLATFORM.DARWIN]).toEqual(["afplay"]);
    expect(SOUND_FALLBACK_PRECEDENCE[PLATFORM.LINUX]).toEqual(["noop"]);
    expect(SOUND_FALLBACK_PRECEDENCE[PLATFORM.WIN32]).toEqual(["noop"]);
  });

  it("defines canonical nutjs execution stage ordering", () => {
    expect(NUTJS_EXECUTION_FALLBACK_PRECEDENCE).toEqual([
      NUTJS_EXECUTION_STAGE.FEATURE_FLAG,
      NUTJS_EXECUTION_STAGE.ALLOWLIST,
      NUTJS_EXECUTION_STAGE.CAPABILITY,
      NUTJS_EXECUTION_STAGE.PERMISSION_DIAGNOSTICS,
      NUTJS_EXECUTION_STAGE.EXECUTION,
    ]);
  });
});
