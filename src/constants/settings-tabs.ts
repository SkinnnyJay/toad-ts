export const SETTINGS_TAB = {
  DEFAULT_PROVIDER: "default_provider",
  MODE: "mode",
  MODEL: "model",
  KEYBINDS: "keybinds",
} as const;

export type SettingsTab = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

export const SETTINGS_TAB_VALUES: SettingsTab[] = [
  SETTINGS_TAB.DEFAULT_PROVIDER,
  SETTINGS_TAB.MODE,
  SETTINGS_TAB.MODEL,
  SETTINGS_TAB.KEYBINDS,
];

export const { DEFAULT_PROVIDER, MODE, MODEL, KEYBINDS } = SETTINGS_TAB;
