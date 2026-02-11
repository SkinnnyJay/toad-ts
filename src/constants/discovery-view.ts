import type { Color } from "@/constants/colors";
import { COLOR } from "@/constants/colors";
import type { ToolSource } from "@/core/cross-tool/discovery-paths";

export const DISCOVERY_VIEW = {
  FLAT: "flat",
  GROUPED: "grouped",
} as const;

export type DiscoveryViewMode = (typeof DISCOVERY_VIEW)[keyof typeof DISCOVERY_VIEW];

export const { FLAT, GROUPED } = DISCOVERY_VIEW;

/** Order for grouped view (sources not in this list appear last). */
export const SOURCE_ORDER: ToolSource[] = [
  "TOADSTOOL",
  "OPENCODE",
  "CLAUDE",
  "CURSOR",
  "CODEX",
  "GEMINI",
];

const SOURCE_COLOR: Record<ToolSource, Color> = {
  TOADSTOOL: COLOR.CYAN,
  OPENCODE: COLOR.BLUE,
  CLAUDE: COLOR.GREEN,
  CURSOR: COLOR.MAGENTA,
  GEMINI: COLOR.YELLOW,
  CODEX: COLOR.WARNING,
};

export const getSourceColor = (source: string): Color =>
  SOURCE_COLOR[source as ToolSource] ?? COLOR.GRAY;
