import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CREDENTIAL_STORE_KIND } from "@/constants/credential-stores";
import { ENCODING } from "@/constants/encodings";
import { ENCRYPTION } from "@/constants/encryption";
import { FILE_PATH } from "@/constants/file-paths";
import { INDENT_SPACES } from "@/constants/json-format";
import { type CredentialScope, type CredentialStore, buildCredentialKey } from "./types";

const CURRENT_VERSION = 1;

export interface EncryptedDiskCredentialStoreOptions {
  filePath?: string;
  keyPath?: string;
  encryptionKey?: string | Buffer;
}

type ResolvedDiskOptions = {
  filePath: string;
  keyPath: string;
  encryptionKey?: string | Buffer;
};

type EncryptedPayload = {
  version: number;
  iv: string;
  tag: string;
  data: string;
};

export class EncryptedDiskCredentialStore implements CredentialStore {
  readonly kind = CREDENTIAL_STORE_KIND.DISK;
  private readonly filePath: string;
  private readonly encryptionKey: Buffer;
  private cache = new Map<string, string>();

  private constructor(options: ResolvedDiskOptions, encryptionKey: Buffer) {
    this.filePath = options.filePath;
    this.encryptionKey = encryptionKey;
  }

  static async create(
    options: EncryptedDiskCredentialStoreOptions = {}
  ): Promise<EncryptedDiskCredentialStore> {
    const resolved = resolveDiskOptions(options);
    const encryptionKey = await resolveEncryptionKey(resolved);
    const store = new EncryptedDiskCredentialStore(resolved, encryptionKey);
    await store.load();
    return store;
  }

  async getToken(scope: CredentialScope): Promise<string | undefined> {
    return this.cache.get(buildCredentialKey(scope));
  }

  async setToken(scope: CredentialScope, token: string): Promise<void> {
    this.cache.set(buildCredentialKey(scope), token);
    await this.persist();
  }

  async deleteToken(scope: CredentialScope): Promise<void> {
    this.cache.delete(buildCredentialKey(scope));
    await this.persist();
  }

  private async load(): Promise<void> {
    const payload = await readEncryptedPayload(this.filePath);
    if (!payload) return;
    if (payload.version !== CURRENT_VERSION) {
      throw new Error(`Unsupported credential payload version: ${payload.version}`);
    }
    const decrypted = decryptPayload(payload, this.encryptionKey);
    const parsed = JSON.parse(decrypted) as Record<string, string>;
    this.cache = new Map(Object.entries(parsed));
  }

  private async persist(): Promise<void> {
    const data = JSON.stringify(Object.fromEntries(this.cache.entries()));
    const payload = encryptPayload(data, this.encryptionKey);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(payload, null, INDENT_SPACES), {
      mode: 0o600,
    });
  }
}

const resolveDiskOptions = (options: EncryptedDiskCredentialStoreOptions): ResolvedDiskOptions => {
  const home = os.homedir();
  const baseDir = path.join(home, FILE_PATH.TOADSTOOL_DIR);
  return {
    filePath: options.filePath ?? path.join(baseDir, "credentials.json"),
    keyPath: options.keyPath ?? path.join(baseDir, "credentials.key"),
    encryptionKey: options.encryptionKey,
  };
};

const resolveEncryptionKey = async (options: ResolvedDiskOptions): Promise<Buffer> => {
  if (options.encryptionKey) {
    return normalizeEncryptionKey(options.encryptionKey);
  }

  const existingKey = await readKeyFile(options.keyPath);
  if (existingKey) return existingKey;

  const generated = randomBytes(ENCRYPTION.KEY_BYTES);
  await fs.mkdir(path.dirname(options.keyPath), { recursive: true });
  await fs.writeFile(options.keyPath, generated, { mode: 0o600 });
  return generated;
};

const normalizeEncryptionKey = (value: string | Buffer): Buffer => {
  const buffer = typeof value === "string" ? Buffer.from(value, ENCODING.UTF8) : value;
  if (buffer.length === ENCRYPTION.KEY_BYTES) return buffer;
  return createHash("sha256").update(buffer).digest();
};

const readKeyFile = async (keyPath: string): Promise<Buffer | null> => {
  try {
    return await fs.readFile(keyPath);
  } catch {
    return null;
  }
};

const readEncryptedPayload = async (filePath: string): Promise<EncryptedPayload | null> => {
  try {
    const raw = await fs.readFile(filePath, ENCODING.UTF8);
    return JSON.parse(raw) as EncryptedPayload;
  } catch {
    return null;
  }
};

const encryptPayload = (plaintext: string, key: Buffer): EncryptedPayload => {
  const iv = randomBytes(ENCRYPTION.IV_BYTES);
  const cipher = createCipheriv(ENCRYPTION.ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, ENCODING.UTF8), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: CURRENT_VERSION,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
};

const decryptPayload = (payload: EncryptedPayload, key: Buffer): string => {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const encrypted = Buffer.from(payload.data, "base64");
  const decipher = createDecipheriv(ENCRYPTION.ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString(ENCODING.UTF8);
};
