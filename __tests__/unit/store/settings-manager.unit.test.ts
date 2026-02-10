import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { FILE_PATH } from "@/constants/file-paths";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultProvider,
  loadSettings,
  setDefaultProvider,
} from "../../../src/store/settings/settings-manager";
import { AgentIdSchema } from "../../../src/types/domain";

const SETTINGS_FILE = join(homedir(), FILE_PATH.TOADSTOOL_DIR, FILE_PATH.SETTINGS_JSON);

const removeSettingsFile = async (): Promise<void> => {
  try {
    await rm(SETTINGS_FILE, { force: true });
  } catch {
    // Ignore cleanup errors in tests
  }
};

beforeEach(async () => {
  await removeSettingsFile();
});

afterEach(async () => {
  await removeSettingsFile();
});

describe("SettingsManager", () => {
  describe("loadSettings()", () => {
    it("should return default settings when file does not exist", async () => {
      const settings = await loadSettings();
      expect(settings).toBeDefined();
      expect(settings.defaultProvider).toBeUndefined();
    });
  });

  describe("getDefaultProvider() and setDefaultProvider()", () => {
    it("should save and retrieve default provider", async () => {
      const agentId = AgentIdSchema.parse("agent-1");
      await setDefaultProvider(agentId, "model-1");

      const provider = await getDefaultProvider();
      expect(provider?.agentId).toBe("agent-1");
      expect(provider?.modelId).toBe("model-1");
    });

    it("should clear default provider when agentId is undefined", async () => {
      await setDefaultProvider(AgentIdSchema.parse("agent-1"), "model-1");
      await setDefaultProvider(undefined);

      const provider = await getDefaultProvider();
      expect(provider).toBeUndefined();
    });

    it("should handle empty modelId", async () => {
      const agentId = AgentIdSchema.parse("agent-1");
      await setDefaultProvider(agentId, "");

      const provider = await getDefaultProvider();
      expect(provider?.agentId).toBe("agent-1");
      expect(provider?.modelId).toBeUndefined();
    });
  });
});
