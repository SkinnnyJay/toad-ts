export const KEYBIND = {
  LEADER_TOKEN: "<<leader>",
  NONE: "none",
  BINDING_SEPARATOR: ",",
  CHORD_SEPARATOR: "+",
  MODIFIER: {
    CTRL: "ctrl",
    META: "meta",
    ALT: "alt",
    SHIFT: "shift",
  },
} as const;

export type KeybindModifier = (typeof KEYBIND.MODIFIER)[keyof typeof KEYBIND.MODIFIER];

export const { LEADER_TOKEN, NONE, BINDING_SEPARATOR, CHORD_SEPARATOR } = KEYBIND;
