import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { FILE_PATH } from "@/constants/file-paths";

import type { McpConfigInput } from "@/core/mcp-config";
export interface McpConfigLoaderOptions {
  projectRoot?: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
}

export const loadMcpConfig = async (
  options: McpConfigLoaderOptions = {}
): Promise<McpConfigInput | null> => {
  const env = options.env ?? process.env;
  const projectRoot = options.projectRoot ?? process.cwd();
  const configPath =
    options.configPath ??
    env[ENV_KEY.TOADSTOOL_MCP_CONFIG_PATH] ??
    join(projectRoot, FILE_PATH.TOADSTOOL_DIR, FILE_PATH.MCP_JSON);

  try {
    const contents = await readFile(configPath, ENCODING.UTF8);
    return JSON.parse(contents) as McpConfigInput;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === ERROR_CODE.ENOENT) {
      return null;
    }
    throw error;
  }
};
