import { SERVER_CONFIG } from "@/config/server";
import { ENV_KEY } from "@/constants/env-keys";
import { HOST_FLAG, PORT_FLAG } from "@/constants/server-cli";
import { EnvManager } from "@/utils/env/env.utils";

export interface ServerRuntimeConfig {
  host: string;
  port: number;
}

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return SERVER_CONFIG.DEFAULT_PORT;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : SERVER_CONFIG.DEFAULT_PORT;
};

const readArgValue = (args: string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
};

export const resolveServerConfig = (
  args: string[],
  env: NodeJS.ProcessEnv = EnvManager.getInstance().getSnapshot()
): ServerRuntimeConfig => {
  const host = readArgValue(args, HOST_FLAG) ?? env[ENV_KEY.TOADSTOOL_SERVER_HOST];
  const portValue =
    readArgValue(args, PORT_FLAG) ?? env[ENV_KEY.TOADSTOOL_SERVER_PORT] ?? undefined;
  return {
    host: host ?? SERVER_CONFIG.DEFAULT_HOST,
    port: parsePort(portValue),
  };
};
