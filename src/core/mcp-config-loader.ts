import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ENCODING } from "@/constants/encodings";
import { ENV_KEY } from "@/constants/env-keys";
import { ERROR_CODE } from "@/constants/error-codes";
import { FILE_PATH } from "@/constants/file-paths";

import { type McpConfigInput, mcpConfigSchema } from "@/core/mcp-config";
import { EnvManager } from "@/utils/env/env.utils";
export interface McpConfigLoaderOptions {
  projectRoot?: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
}

export const loadMcpConfig = async (
  options: McpConfigLoaderOptions = {}
): Promise<McpConfigInput | null> => {
  const env = options.env ?? EnvManager.getInstance().getSnapshot();
  const projectRoot = options.projectRoot ?? process.cwd();
  const configPath =
    options.configPath ??
    env[ENV_KEY.TOADSTOOL_MCP_CONFIG_PATH] ??
    join(projectRoot, FILE_PATH.TOADSTOOL_DIR, FILE_PATH.MCP_JSON);

  try {
    const contents = await readFile(configPath, ENCODING.UTF8);
    const parsed: unknown = JSON.parse(contents);
    return mcpConfigSchema.parse(parsed);
  } catch (error) {
    if (isErrnoException(error) && error.code === ERROR_CODE.ENOENT) {
      return null;
    }
    throw error;
  }
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error;
