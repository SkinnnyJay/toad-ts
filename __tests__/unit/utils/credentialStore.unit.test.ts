import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EncryptedDiskCredentialStore,
  MemoryCredentialStore,
  createCredentialStore,
} from "../../../src/utils/credentials/index";

const createTempDir = async (): Promise<string> => {
  return fs.mkdtemp(path.join(os.tmpdir(), "toad-credentials-"));
};

describe("credential stores", (): void => {
  it("stores tokens in memory per harness", async (): Promise<void> => {
    const store = new MemoryCredentialStore();
    const scope = { harnessId: "claude-cli" };

    await store.setToken(scope, "token-a");

    expect(await store.getToken(scope)).toBe("token-a");
    expect(await store.getToken({ harnessId: "other" })).toBeUndefined();

    await store.deleteToken(scope);
    expect(await store.getToken(scope)).toBeUndefined();
  });

  it("persists encrypted tokens to disk", async (): Promise<void> => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "credentials.json");
    const keyPath = path.join(tempDir, "credentials.key");

    const store = await EncryptedDiskCredentialStore.create({
      filePath,
      keyPath,
      encryptionKey: "unit-test-key",
    });

    const scope = { harnessId: "claude-cli", tokenType: "api-key" };
    await store.setToken(scope, "super-secret");

    const reloaded = await EncryptedDiskCredentialStore.create({
      filePath,
      keyPath,
      encryptionKey: "unit-test-key",
    });

    expect(await reloaded.getToken(scope)).toBe("super-secret");

    const raw = await fs.readFile(filePath, "utf8");
    expect(raw).not.toContain("super-secret");
  });

  it("falls back to disk storage when keytar is unavailable", async (): Promise<void> => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "credentials.json");
    const keyPath = path.join(tempDir, "credentials.key");

    const store = await createCredentialStore({
      keytar: { loader: async () => null },
      disk: { filePath, keyPath, encryptionKey: "unit-test-key" },
    });

    expect(store.kind).toBe("disk");

    const scope = { harnessId: "claude-cli" };
    await store.setToken(scope, "fallback-token");

    expect(await store.getToken(scope)).toBe("fallback-token");
  });
});
