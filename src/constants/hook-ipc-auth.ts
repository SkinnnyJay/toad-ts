export const HOOK_IPC_AUTH = {
  TOKEN_HEADER: "x-toadstool-hook-token",
  NONCE_HEADER: "x-toadstool-hook-nonce",
} as const;

export type HookIpcAuthHeader = (typeof HOOK_IPC_AUTH)[keyof typeof HOOK_IPC_AUTH];

export const { TOKEN_HEADER, NONCE_HEADER } = HOOK_IPC_AUTH;
