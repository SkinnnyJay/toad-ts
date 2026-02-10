export const SETTINGS_TAB = {
  DEFAULT_PROVIDER: "default_provider",
  KEYBINDS: "keybinds",
} as const;

export type SettingsTab = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

export const SETTINGS_TAB_VALUES: SettingsTab[] = [
  SETTINGS_TAB.DEFAULT_PROVIDER,
  SETTINGS_TAB.KEYBINDS,
];

export const { DEFAULT_PROVIDER, KEYBINDS } = SETTINGS_TAB;
