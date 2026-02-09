import type { AgentConfig } from "@/agents/agent-config";
import { PERMISSION } from "@/constants/permissions";
import { TOOL_KIND } from "@/constants/tool-kinds";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { ToolPermissionOverrides } from "@/tools/permissions";
import { AgentIdSchema } from "@/types/domain";

const BUILD_AGENT_PERMISSIONS: ToolPermissionOverrides = {
  [TOOL_KIND.READ]: PERMISSION.ALLOW,
  [TOOL_KIND.EDIT]: PERMISSION.ALLOW,
  [TOOL_KIND.DELETE]: PERMISSION.ALLOW,
  [TOOL_KIND.MOVE]: PERMISSION.ALLOW,
  [TOOL_KIND.SEARCH]: PERMISSION.ALLOW,
  [TOOL_KIND.EXECUTE]: PERMISSION.ALLOW,
  [TOOL_KIND.THINK]: PERMISSION.ALLOW,
  [TOOL_KIND.FETCH]: PERMISSION.ALLOW,
  [TOOL_KIND.SWITCH_MODE]: PERMISSION.ALLOW,
  [TOOL_KIND.OTHER]: PERMISSION.ALLOW,
};

export const createBuildAgent = (harness: HarnessConfig): AgentConfig => {
  return {
    id: AgentIdSchema.parse(`${harness.id}:build`),
    name: `${harness.name} Build`,
    harnessId: harness.id,
    description: "Full-access agent for implementation work.",
    permissions: BUILD_AGENT_PERMISSIONS,
  };
};
