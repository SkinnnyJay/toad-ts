import { AGENT_MANAGEMENT_COMMAND } from "@/constants/agent-management-commands";
import { parseGeminiListSessionsOutput } from "@/core/cli-agent/agent-command-parsers";
import type { HarnessConfig } from "@/harness/harnessConfig";
import {
  mapGeminiStatusLines,
  resolveNativeCommandArgs,
} from "./agent-management-command-resolver";

export interface HarnessCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const resolveGeminiStatusLines = async (
  harness: HarnessConfig,
  runCommand: (harness: HarnessConfig, args: string[]) => Promise<HarnessCommandResult>
): Promise<string[]> => {
  const statusLines = mapGeminiStatusLines(harness);
  try {
    const result = await runCommand(
      harness,
      resolveNativeCommandArgs(harness, AGENT_MANAGEMENT_COMMAND.STATUS)
    );
    if (result.exitCode !== 0) {
      return statusLines;
    }
    const sessions = parseGeminiListSessionsOutput(result.stdout);
    if (sessions.count === 0) {
      return statusLines;
    }
    return [...statusLines, `Sessions: ${sessions.count}`];
  } catch {
    return statusLines;
  }
};
