import { FILE_PATH } from "@/constants/file-paths";

export const RULE_SOURCE = {
  TOADSTOOL: FILE_PATH.TOADSTOOL_DIR,
  CLAUDE: ".claude",
  CURSOR: ".cursor",
  OPENCODE: ".opencode",
  GEMINI: ".gemini",
} as const;

export type RuleSource = (typeof RULE_SOURCE)[keyof typeof RULE_SOURCE];

export const RULE_SOURCE_PRECEDENCE: RuleSource[] = [
  RULE_SOURCE.GEMINI,
  RULE_SOURCE.OPENCODE,
  RULE_SOURCE.CURSOR,
  RULE_SOURCE.CLAUDE,
  RULE_SOURCE.TOADSTOOL,
];

export const RULES_SUBDIR = "rules";
export const PERMISSION_RULES_FILE = "permissions.json";

export const {
  TOADSTOOL: RULE_SOURCE_TOADSTOOL,
  CLAUDE: RULE_SOURCE_CLAUDE,
  CURSOR: RULE_SOURCE_CURSOR,
  OPENCODE: RULE_SOURCE_OPENCODE,
  GEMINI: RULE_SOURCE_GEMINI,
} = RULE_SOURCE;
