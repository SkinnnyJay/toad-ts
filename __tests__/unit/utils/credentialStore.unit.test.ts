import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CREDENTIAL_STORE_KIND } from "@/constants/credential-stores";
import { ENCODING } from "@/constants/encodings";
import { describe, expect, it } from "vitest";
import {
  EncryptedDiskCredentialStore,
  MemoryCredentialStore,
  createCredentialStore,
} from "../../../src/utils/credentials/index";

const createTempDir = async (): Promise<string> => {
  return fs.mkdtemp(path.join(os.tmpdir(), "toadstool-credentials-"));
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

    const raw = await fs.readFile(filePath, ENCODING.UTF8);
    expect(raw).not.toContain("super-secret");
  });

  it("defaults to memory when keytar is unavailable and no explicit disk mode", async (): Promise<void> => {
    const store = await createCredentialStore({ keytar: { loader: async () => null } });
    expect(store.kind).toBe(CREDENTIAL_STORE_KIND.MEMORY);
  });

  it("uses disk storage only when explicitly requested", async (): Promise<void> => {
    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "credentials.json");
    const keyPath = path.join(tempDir, "credentials.key");

    const store = await createCredentialStore({
      mode: "disk",
      disk: { filePath, keyPath, encryptionKey: "unit-test-key" },
    });

    expect(store.kind).toBe(CREDENTIAL_STORE_KIND.DISK);

    const scope = { harnessId: "claude-cli" };
    await store.setToken(scope, "fallback-token");

    expect(await store.getToken(scope)).toBe("fallback-token");
  });

  it("honors TOADSTOOL_CREDENTIAL_STORE override", async (): Promise<void> => {
    const original = process.env.TOADSTOOL_CREDENTIAL_STORE;
    process.env.TOADSTOOL_CREDENTIAL_STORE = "disk";

    const tempDir = await createTempDir();
    const filePath = path.join(tempDir, "credentials.json");
    const keyPath = path.join(tempDir, "credentials.key");

    const store = await createCredentialStore({
      env: process.env,
      disk: { filePath, keyPath, encryptionKey: "unit-test-key" },
    });

    expect(store.kind).toBe(CREDENTIAL_STORE_KIND.DISK);

    process.env.TOADSTOOL_CREDENTIAL_STORE = original;
  });
});
