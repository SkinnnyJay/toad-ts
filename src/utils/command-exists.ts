import { existsSync } from "node:fs";
import path, { delimiter } from "node:path";
import { ENV_KEY } from "@/constants/env-keys";
import { EnvManager } from "@/utils/env/env.utils";

export interface CommandExistsOptions {
  env?: NodeJS.ProcessEnv;
  baseDir?: string;
}

const looksLikePath = (command: string): boolean =>
  command.includes("/") || command.includes(path.sep);

export const commandExists = (command: string, options: CommandExistsOptions = {}): boolean => {
  const env = options.env ?? EnvManager.getInstance().getSnapshot();
  const baseDir = options.baseDir ?? process.cwd();

  if (looksLikePath(command)) {
    const resolved = path.isAbsolute(command) ? command : path.join(baseDir, command);
    return existsSync(resolved);
  }

  const pathValue = env[ENV_KEY.PATH] ?? "";
  const segments = pathValue.split(delimiter).filter(Boolean);
  return segments.some((segment) => existsSync(path.join(segment, command)));
};
