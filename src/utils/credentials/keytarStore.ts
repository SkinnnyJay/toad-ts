import {
  type CredentialScope,
  type CredentialStore,
  DEFAULT_SERVICE_NAME,
  buildCredentialKey,
} from "./types";

export interface KeytarModule {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

export interface KeytarCredentialStoreOptions {
  keytar: KeytarModule;
  service?: string;
}

export class KeytarCredentialStore implements CredentialStore {
  readonly kind = "keytar" as const;
  private readonly service: string;

  constructor(private readonly options: KeytarCredentialStoreOptions) {
    this.service = options.service ?? DEFAULT_SERVICE_NAME;
  }

  async getToken(scope: CredentialScope): Promise<string | undefined> {
    const account = buildCredentialKey(scope);
    const value = await this.options.keytar.getPassword(this.service, account);
    return value ?? undefined;
  }

  async setToken(scope: CredentialScope, token: string): Promise<void> {
    const account = buildCredentialKey(scope);
    await this.options.keytar.setPassword(this.service, account, token);
  }

  async deleteToken(scope: CredentialScope): Promise<void> {
    const account = buildCredentialKey(scope);
    await this.options.keytar.deletePassword(this.service, account);
  }
}
