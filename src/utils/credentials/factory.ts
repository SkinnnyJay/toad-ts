import {
  EncryptedDiskCredentialStore,
  type EncryptedDiskCredentialStoreOptions,
} from "./encryptedDiskStore";
import { KeytarCredentialStore, type KeytarModule } from "./keytarStore";
import { MemoryCredentialStore } from "./memoryStore";
import { type CredentialStore, type CredentialStoreKind, DEFAULT_SERVICE_NAME } from "./types";

export interface CredentialStoreFactoryOptions {
  mode?: CredentialStoreKind;
  keytar?: {
    service?: string;
    loader?: () => Promise<KeytarModule | null>;
  };
  disk?: EncryptedDiskCredentialStoreOptions;
}

export const createCredentialStore = async (
  options: CredentialStoreFactoryOptions = {}
): Promise<CredentialStore> => {
  const mode = options.mode;
  if (mode === "memory") {
    return new MemoryCredentialStore();
  }

  if (mode === "disk") {
    return EncryptedDiskCredentialStore.create(options.disk);
  }

  if (mode === "keytar") {
    const keytar = await loadKeytar(options.keytar?.loader);
    if (!keytar) {
      throw new Error("Keytar module unavailable");
    }
    return new KeytarCredentialStore({
      keytar,
      service: options.keytar?.service ?? DEFAULT_SERVICE_NAME,
    });
  }

  const keytar = await loadKeytar(options.keytar?.loader);
  if (keytar) {
    return new KeytarCredentialStore({
      keytar,
      service: options.keytar?.service ?? DEFAULT_SERVICE_NAME,
    });
  }

  try {
    return await EncryptedDiskCredentialStore.create(options.disk);
  } catch {
    return new MemoryCredentialStore();
  }
};

const loadKeytar = async (
  loader?: () => Promise<KeytarModule | null>
): Promise<KeytarModule | null> => {
  if (loader) return loader();
  try {
    const module = await import("keytar");
    const resolved = module.default ?? module;
    return resolved as KeytarModule;
  } catch {
    return null;
  }
};
