import { SERVER_CONFIG } from "@/config/server";
import { ENV_KEY } from "@/constants/env-keys";
import { EnvManager } from "@/utils/env/env.utils";

export interface ServerRuntimeConfig {
  host: string;
  port: number;
}

export interface ServerConfigOverrides {
  host?: string;
  port?: number;
}

const parsePort = (value: string | number | undefined): number => {
  if (value === undefined) {
    return SERVER_CONFIG.DEFAULT_PORT;
  }
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : SERVER_CONFIG.DEFAULT_PORT;
};

export const resolveServerConfig = (
  overrides: ServerConfigOverrides = {},
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): ServerRuntimeConfig => {
  const host = overrides.host ?? env[ENV_KEY.TOADSTOOL_SERVER_HOST] ?? SERVER_CONFIG.DEFAULT_HOST;
  const portValue =
    overrides.port !== undefined ? overrides.port : env[ENV_KEY.TOADSTOOL_SERVER_PORT];
  return {
    host,
    port: parsePort(portValue),
  };
};
