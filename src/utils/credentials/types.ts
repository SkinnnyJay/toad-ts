export type CredentialStoreKind = "keytar" | "disk" | "memory";

export interface CredentialScope {
  harnessId: string;
  accountId?: string;
  tokenType?: string;
}

export interface CredentialStore {
  readonly kind: CredentialStoreKind;
  getToken(scope: CredentialScope): Promise<string | undefined>;
  setToken(scope: CredentialScope, token: string): Promise<void>;
  deleteToken(scope: CredentialScope): Promise<void>;
}

export const DEFAULT_CREDENTIAL_ACCOUNT = "default";
export const DEFAULT_TOKEN_TYPE = "auth";
export const DEFAULT_SERVICE_NAME = "toadstool";

export const buildCredentialKey = (scope: CredentialScope): string => {
  const accountId = scope.accountId ?? DEFAULT_CREDENTIAL_ACCOUNT;
  const tokenType = scope.tokenType ?? DEFAULT_TOKEN_TYPE;
  return `${scope.harnessId}:${accountId}:${tokenType}`;
};
