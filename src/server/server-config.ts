import { isIP } from "node:net";
import { LIMIT } from "@/config/limits";
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

const HOSTNAME_PATTERN =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;

const isValidServerHost = (host: string): boolean =>
  isIP(host) !== 0 || HOSTNAME_PATTERN.test(host);

const parsePort = (value: string | number | undefined): number | null => {
  if (value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    const isValidPort =
      Number.isInteger(value) && value >= LIMIT.SERVER_PORT_MIN && value <= LIMIT.SERVER_PORT_MAX;
    return isValidPort ? value : null;
  }
  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }
  const parsed = Number.parseInt(normalizedValue, 10);
  const isValidPort = parsed >= LIMIT.SERVER_PORT_MIN && parsed <= LIMIT.SERVER_PORT_MAX;
  return isValidPort ? parsed : null;
};

const normalizeHost = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }
  const normalizedHost = value.trim();
  if (normalizedHost.length === 0) {
    return null;
  }
  return isValidServerHost(normalizedHost) ? normalizedHost : null;
};

export const resolveServerConfig = (
  overrides: ServerConfigOverrides = {},
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): ServerRuntimeConfig => {
  const host =
    normalizeHost(overrides.host) ??
    normalizeHost(env[ENV_KEY.TOADSTOOL_SERVER_HOST]) ??
    SERVER_CONFIG.DEFAULT_HOST;
  const overridePort = parsePort(overrides.port);
  const envPort = parsePort(env[ENV_KEY.TOADSTOOL_SERVER_PORT]);
  return {
    host,
    port: overridePort ?? envPort ?? SERVER_CONFIG.DEFAULT_PORT,
  };
};
