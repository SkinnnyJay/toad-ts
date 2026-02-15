import { PLATFORM } from "@/constants/platform";

export const CLIPBOARD_COMMAND_NAME = {
  PBCOPY: "pbcopy",
  CLIP: "clip",
  WLCOPY: "wl-copy",
  XCLIP: "xclip",
  XSEL: "xsel",
} as const;

export type ClipboardCommandName =
  (typeof CLIPBOARD_COMMAND_NAME)[keyof typeof CLIPBOARD_COMMAND_NAME];

export const CLIPBOARD_FALLBACK_PRECEDENCE = {
  DARWIN: [CLIPBOARD_COMMAND_NAME.PBCOPY],
  WINDOWS: [CLIPBOARD_COMMAND_NAME.CLIP],
  LINUX_WAYLAND: [CLIPBOARD_COMMAND_NAME.WLCOPY],
  LINUX_X11: [CLIPBOARD_COMMAND_NAME.XCLIP, CLIPBOARD_COMMAND_NAME.XSEL],
} as const satisfies Record<string, readonly ClipboardCommandName[]>;

export const SOUND_FALLBACK_PRECEDENCE = {
  [PLATFORM.DARWIN]: ["afplay"],
  [PLATFORM.LINUX]: ["noop"],
  [PLATFORM.WIN32]: ["noop"],
} as const;

export const NUTJS_EXECUTION_STAGE = {
  FEATURE_FLAG: "feature_flag",
  ALLOWLIST: "allowlist",
  CAPABILITY: "capability",
  PERMISSION_DIAGNOSTICS: "permission_diagnostics",
  EXECUTION: "execution",
} as const;

export type NutJsExecutionStage =
  (typeof NUTJS_EXECUTION_STAGE)[keyof typeof NUTJS_EXECUTION_STAGE];

export const NUTJS_EXECUTION_FALLBACK_PRECEDENCE = [
  NUTJS_EXECUTION_STAGE.FEATURE_FLAG,
  NUTJS_EXECUTION_STAGE.ALLOWLIST,
  NUTJS_EXECUTION_STAGE.CAPABILITY,
  NUTJS_EXECUTION_STAGE.PERMISSION_DIAGNOSTICS,
  NUTJS_EXECUTION_STAGE.EXECUTION,
] as const;
