import { CREDENTIAL_STORE_KIND } from "@/constants/credential-stores";
import { ENV_KEY } from "@/constants/env-keys";
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
  env?: NodeJS.ProcessEnv;
}

const parseEnvMode = (env?: NodeJS.ProcessEnv): CredentialStoreKind | undefined => {
  const raw = env?.[ENV_KEY.TOADSTOOL_CREDENTIAL_STORE];
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === CREDENTIAL_STORE_KIND.KEYTAR ||
    normalized === CREDENTIAL_STORE_KIND.DISK ||
    normalized === CREDENTIAL_STORE_KIND.MEMORY
  ) {
    return normalized;
  }
  return undefined;
};

export const createCredentialStore = async (
  options: CredentialStoreFactoryOptions = {}
): Promise<CredentialStore> => {
  const effectiveMode = options.mode ?? parseEnvMode(options.env ?? process.env);

  if (effectiveMode === CREDENTIAL_STORE_KIND.MEMORY) {
    return new MemoryCredentialStore();
  }

  if (effectiveMode === CREDENTIAL_STORE_KIND.DISK) {
    return EncryptedDiskCredentialStore.create(options.disk);
  }

  if (effectiveMode === CREDENTIAL_STORE_KIND.KEYTAR) {
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

  return new MemoryCredentialStore();
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
