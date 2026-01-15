import { type CredentialScope, type CredentialStore, buildCredentialKey } from "./types";

export class MemoryCredentialStore implements CredentialStore {
  readonly kind = "memory" as const;
  private readonly cache = new Map<string, string>();

  async getToken(scope: CredentialScope): Promise<string | undefined> {
    return this.cache.get(buildCredentialKey(scope));
  }

  async setToken(scope: CredentialScope, token: string): Promise<void> {
    this.cache.set(buildCredentialKey(scope), token);
  }

  async deleteToken(scope: CredentialScope): Promise<void> {
    this.cache.delete(buildCredentialKey(scope));
  }
}
