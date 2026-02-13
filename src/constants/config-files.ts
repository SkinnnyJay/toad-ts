export const CONFIG_FILE = {
  PROJECT_JSON: "toadstool.json",
  PROJECT_JSONC: "toadstool.jsonc",
  GLOBAL_CONFIG_DIR: ".config",
  GLOBAL_APP_DIR: "toadstool",
  GLOBAL_CONFIG_FILE: "config.json",
} as const;

export type ConfigFile = (typeof CONFIG_FILE)[keyof typeof CONFIG_FILE];

export const PROJECT_CONFIG_FILES: ConfigFile[] = [
  CONFIG_FILE.PROJECT_JSON,
  CONFIG_FILE.PROJECT_JSONC,
];

export const {
  PROJECT_JSON,
  PROJECT_JSONC,
  GLOBAL_CONFIG_DIR,
  GLOBAL_APP_DIR,
  GLOBAL_CONFIG_FILE,
} = CONFIG_FILE;
