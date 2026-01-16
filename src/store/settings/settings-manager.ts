import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ERROR_CODE } from "@/constants/error-codes";
import { FILE_PATH } from "@/constants/file-paths";
import type { AgentId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
import { type Settings, defaultSettings, settingsSchema } from "./settings-schema";

const SETTINGS_DIR = join(homedir(), FILE_PATH.TOADSTOOL_DIR);
const SETTINGS_FILE = join(SETTINGS_DIR, FILE_PATH.SETTINGS_JSON);

const parseSettingsFile = (raw: unknown, filePath: string): Settings => {
  try {
    return settingsSchema.parse(raw);
  } catch (error) {
    if (error instanceof Error) {
      error.message = `Invalid settings config at ${filePath}: ${error.message}`;
    }
    throw error;
  }
};

const readSettingsFile = async (): Promise<Settings | null> => {
  try {
    const contents = await readFile(SETTINGS_FILE, ENCODING.UTF8);
    const parsed = JSON.parse(contents) as unknown;
    return parseSettingsFile(parsed, SETTINGS_FILE);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === ERROR_CODE.ENOENT) {
      return null;
    }
    throw error;
  }
};

const writeSettingsFile = async (settings: Settings): Promise<void> => {
  try {
    await mkdir(SETTINGS_DIR, { recursive: true });
    const contents = JSON.stringify(settings, null, 2);
    await writeFile(SETTINGS_FILE, contents, ENCODING.UTF8);
  } catch (error) {
    if (error instanceof Error) {
      error.message = `Failed to write settings to ${SETTINGS_FILE}: ${error.message}`;
    }
    throw error;
  }
};

export const loadSettings = async (): Promise<Settings> => {
  const settings = await readSettingsFile();
  return settings ?? defaultSettings;
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  const validated = settingsSchema.parse(settings);
  await writeSettingsFile(validated);
};

export const getDefaultProvider = async (): Promise<Settings["defaultProvider"]> => {
  const settings = await loadSettings();
  return settings.defaultProvider;
};

export const setDefaultProvider = async (
  agentId: AgentId | undefined,
  modelId?: string
): Promise<void> => {
  const settings = await loadSettings();
  const validatedAgentId = agentId ? AgentIdSchema.parse(agentId) : undefined;
  const updated: Settings = {
    ...settings,
    defaultProvider: validatedAgentId
      ? {
          agentId: validatedAgentId,
          modelId: modelId && modelId.length > 0 ? modelId : undefined,
        }
      : undefined,
  };
  await saveSettings(updated);
};
