import { HARNESS_DEFAULT } from "@/constants/harness-defaults";

export const HARNESS_INSTALL_GUIDANCE = {
  [HARNESS_DEFAULT.CLAUDE_CLI_ID]:
    "Install Claude Code ACP (`claude-code-acp`) and ensure it is on your PATH.",
  [HARNESS_DEFAULT.GEMINI_CLI_ID]: "Install Gemini CLI (`gemini`) and ensure it is on your PATH.",
  [HARNESS_DEFAULT.CODEX_CLI_ID]: "Install Codex CLI (`codex`) and ensure it is on your PATH.",
  [HARNESS_DEFAULT.CURSOR_CLI_ID]:
    "Install Cursor CLI (`cursor-agent` or `agent`) and ensure it is on your PATH.",
} as const;
