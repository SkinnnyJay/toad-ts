import { describe, expect, it, vi } from "vitest";
import { CREDENTIAL_STORE_KIND } from "../../../src/constants/credential-stores";
import { EncryptedDiskCredentialStore } from "../../../src/utils/credentials/encryptedDiskStore";
import { createCredentialStore } from "../../../src/utils/credentials/factory";
import { KeytarCredentialStore } from "../../../src/utils/credentials/keytarStore";
import { MemoryCredentialStore } from "../../../src/utils/credentials/memoryStore";
import type { CredentialScope } from "../../../src/utils/credentials/types";

describe("Credential Stores", () => {
  const createScope = (): CredentialScope => ({
    harnessId: "harness-1",
    accountId: "account-1",
    tokenType: "api_key",
  });

  describe("KeytarCredentialStore", () => {
    it("should get and set tokens", async () => {
      const mockKeytar = {
        getPassword: vi.fn().mockResolvedValue(null),
        setPassword: vi.fn().mockResolvedValue(undefined),
        deletePassword: vi.fn().mockResolvedValue(true),
      };

      const store = new KeytarCredentialStore({ keytar: mockKeytar });
      const scope = createScope();

      await store.setToken(scope, "test-token");
      expect(mockKeytar.setPassword).toHaveBeenCalled();

      const token = await store.getToken(scope);
      expect(mockKeytar.getPassword).toHaveBeenCalled();
    });

    it("should delete tokens", async () => {
      const mockKeytar = {
        getPassword: vi.fn().mockResolvedValue("token"),
        setPassword: vi.fn().mockResolvedValue(undefined),
        deletePassword: vi.fn().mockResolvedValue(true),
      };

      const store = new KeytarCredentialStore({ keytar: mockKeytar });
      const scope = createScope();

      await store.deleteToken(scope);
      expect(mockKeytar.deletePassword).toHaveBeenCalled();
    });
  });

  describe("MemoryCredentialStore", () => {
    it("should store and retrieve tokens in memory", async () => {
      const store = new MemoryCredentialStore();
      const scope = createScope();

      await store.setToken(scope, "test-token");
      const token = await store.getToken(scope);

      expect(token).toBe("test-token");
    });

    it("should delete tokens from memory", async () => {
      const store = new MemoryCredentialStore();
      const scope = createScope();

      await store.setToken(scope, "test-token");
      await store.deleteToken(scope);
      const token = await store.getToken(scope);

      expect(token).toBeUndefined();
    });
  });

  describe("EncryptedDiskCredentialStore", () => {
    it("should create store and encrypt/decrypt tokens", async () => {
      // Use a temp file path that will be cleaned up
      const crypto = await import("node:crypto");
      const tempFile = `/tmp/test-creds-${crypto.randomBytes(4).toString("hex")}.json`;
      const tempKey = `/tmp/test-key-${crypto.randomBytes(4).toString("hex")}.bin`;

      try {
        const store = await EncryptedDiskCredentialStore.create({
          filePath: tempFile,
          keyPath: tempKey,
        });

        const scope = createScope();
        await store.setToken(scope, "test-token");

        const token = await store.getToken(scope);
        expect(token).toBe("test-token");
      } finally {
        // Cleanup
        try {
          await import("node:fs/promises").then((fs) => fs.unlink(tempFile).catch(() => {}));
          await import("node:fs/promises").then((fs) => fs.unlink(tempKey).catch(() => {}));
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe("createCredentialStore()", () => {
    it("should create memory store when mode is MEMORY", async () => {
      const store = await createCredentialStore({
        mode: CREDENTIAL_STORE_KIND.MEMORY,
      });

      expect(store.kind).toBe(CREDENTIAL_STORE_KIND.MEMORY);
    });

    it("should create keytar store when keytar is available", async () => {
      const mockKeytar = {
        getPassword: vi.fn().mockResolvedValue(null),
        setPassword: vi.fn().mockResolvedValue(undefined),
        deletePassword: vi.fn().mockResolvedValue(true),
      };

      const store = await createCredentialStore({
        mode: CREDENTIAL_STORE_KIND.KEYTAR,
        keytar: {
          loader: async () => mockKeytar,
        },
      });

      expect(store.kind).toBe(CREDENTIAL_STORE_KIND.KEYTAR);
    });

    it("should throw error when keytar mode requested but unavailable", async () => {
      await expect(
        createCredentialStore({
          mode: CREDENTIAL_STORE_KIND.KEYTAR,
          keytar: {
            loader: async () => null,
          },
        })
      ).rejects.toThrow("Keytar module unavailable");
    });

    it("should use environment variable for mode", async () => {
      const env = {
        TOADSTOOL_CREDENTIAL_STORE: CREDENTIAL_STORE_KIND.MEMORY,
      };

      const store = await createCredentialStore({ env });

      expect(store.kind).toBe(CREDENTIAL_STORE_KIND.MEMORY);
    });
  });
});
