import type { AgentConfig } from "@/agents/agent-config";
import { PERMISSION } from "@/constants/permissions";
import { SESSION_MODE } from "@/constants/session-modes";
import { TOOL_KIND } from "@/constants/tool-kinds";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { ToolPermissionOverrides } from "@/tools/permissions";
import { AgentIdSchema } from "@/types/domain";

const PLAN_AGENT_PERMISSIONS: ToolPermissionOverrides = {
  [TOOL_KIND.READ]: PERMISSION.ALLOW,
  [TOOL_KIND.SEARCH]: PERMISSION.ALLOW,
  [TOOL_KIND.FETCH]: PERMISSION.ALLOW,
  [TOOL_KIND.THINK]: PERMISSION.ALLOW,
  [TOOL_KIND.EDIT]: PERMISSION.ASK,
  [TOOL_KIND.MOVE]: PERMISSION.ASK,
  [TOOL_KIND.EXECUTE]: PERMISSION.ASK,
  [TOOL_KIND.DELETE]: PERMISSION.DENY,
  [TOOL_KIND.SWITCH_MODE]: PERMISSION.ASK,
  [TOOL_KIND.OTHER]: PERMISSION.ASK,
};

export const createPlanAgent = (harness: HarnessConfig): AgentConfig => {
  return {
    id: AgentIdSchema.parse(`${harness.id}:plan`),
    name: `${harness.name} Plan`,
    harnessId: harness.id,
    description: "Read-first agent that requests permission for edits and commands.",
    sessionMode: SESSION_MODE.READ_ONLY,
    permissions: PLAN_AGENT_PERMISSIONS,
  };
};
