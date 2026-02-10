import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { ENCODING } from "@/constants/encodings";
import { FILE_PATH } from "@/constants/file-paths";
import { TERMINAL_SETUP_LINES, TERMINAL_SETUP_SCRIPT } from "@/constants/terminal-setup";

export interface TerminalSetupResult {
  scriptPath: string;
  contents: string;
}

export const writeTerminalSetupScript = async (
  homeDir: string = homedir()
): Promise<TerminalSetupResult> => {
  const configDir = path.join(homeDir, FILE_PATH.TOADSTOOL_DIR);
  await mkdir(configDir, { recursive: true });
  const scriptPath = path.join(configDir, TERMINAL_SETUP_SCRIPT);
  const contents = `${TERMINAL_SETUP_LINES.join("\n")}\n`;
  await writeFile(scriptPath, contents, ENCODING.UTF8);
  return { scriptPath, contents };
};
