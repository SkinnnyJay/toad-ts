import { LIMIT } from "@/config/limits";

export const SERVER_CONFIG = {
  DEFAULT_HOST: "127.0.0.1",
  DEFAULT_PORT: LIMIT.SERVER_DEFAULT_PORT,
  MAX_BODY_BYTES: 1_000_000,
} as const;

export type ServerConfig = typeof SERVER_CONFIG;

export const { DEFAULT_HOST, DEFAULT_PORT, MAX_BODY_BYTES } = SERVER_CONFIG;
