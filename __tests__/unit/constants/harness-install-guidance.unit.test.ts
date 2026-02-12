import { HARNESS_DEFAULT } from "@/constants/harness-defaults";
import { HARNESS_INSTALL_GUIDANCE } from "@/constants/harness-install-guidance";
import { describe, expect, it } from "vitest";

describe("HARNESS_INSTALL_GUIDANCE", () => {
  it("defines install hints for all supported CLI harnesses", () => {
    expect(HARNESS_INSTALL_GUIDANCE).toEqual({
      [HARNESS_DEFAULT.CLAUDE_CLI_ID]:
        "Install Claude Code ACP (`claude-code-acp`) and ensure it is on your PATH.",
      [HARNESS_DEFAULT.GEMINI_CLI_ID]:
        "Install Gemini CLI (`gemini`) and ensure it is on your PATH.",
      [HARNESS_DEFAULT.CODEX_CLI_ID]: "Install Codex CLI (`codex`) and ensure it is on your PATH.",
      [HARNESS_DEFAULT.CURSOR_CLI_ID]:
        "Install Cursor CLI (`cursor-agent` or `agent`) and ensure it is on your PATH.",
    });
  });
});
