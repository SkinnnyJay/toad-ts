import type { AgentConfig } from "@/agents/agent-config";
import { READ_ONLY_PERMISSIONS } from "@/agents/builtin/permissions";
import { SESSION_MODE } from "@/constants/session-modes";
import type { HarnessConfig } from "@/harness/harnessConfig";
import { AgentIdSchema } from "@/types/domain";

export const createTitleAgent = (harness: HarnessConfig): AgentConfig => {
  return {
    id: AgentIdSchema.parse(`${harness.id}:title`),
    name: `${harness.name} Title`,
    harnessId: harness.id,
    description: "Hidden agent for session title generation.",
    sessionMode: SESSION_MODE.READ_ONLY,
    permissions: READ_ONLY_PERMISSIONS,
    hidden: true,
  };
};
