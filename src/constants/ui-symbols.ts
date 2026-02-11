import { ENV_KEY } from "@/constants/env-keys";
import { EnvManager } from "@/utils/env/env.utils";

export const UI_SYMBOLS = {
  BULLET: "•",
  CHEVRON: "›",
  CHECK: "✓",
  CROSS: "✗",
  SPINNER: "⟳",
  HALF: "◑",
  BLOCKED: "⊘",
  UNKNOWN: "?",
  LIGHTNING: "⚡",
  ELLIPSIS: "…",
  DOT_FILLED: "●",
  DOT_EMPTY: "○",
  ARROW: "→",
  MESSAGE_EXPANDED: "▾",
  MESSAGE_COLLAPSED: "▶",
} as const;

export const UI_SYMBOLS_ASCII = {
  BULLET: "*",
  CHEVRON: ">",
  CHECK: "x",
  CROSS: "x",
  SPINNER: "~",
  HALF: "o",
  BLOCKED: "!",
  UNKNOWN: "?",
  LIGHTNING: "!",
  ELLIPSIS: "...",
  DOT_FILLED: "*",
  DOT_EMPTY: "o",
  ARROW: "->",
  MESSAGE_EXPANDED: "v",
  MESSAGE_COLLAPSED: ">",
} as const;

export type UiSymbols = Record<keyof typeof UI_SYMBOLS, string>;

export const resolveUiSymbols = (
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): UiSymbols => {
  const forceAscii = env[ENV_KEY.TOADSTOOL_ASCII]?.toLowerCase() === "true";
  return forceAscii ? UI_SYMBOLS_ASCII : UI_SYMBOLS;
};
