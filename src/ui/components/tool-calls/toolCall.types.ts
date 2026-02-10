import type { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import type { ToolCallId } from "@/types/domain";

export interface ToolCall {
  id: ToolCallId;
  name: string;
  description?: string;
  arguments: Record<string, unknown>;
  status:
    | typeof TOOL_CALL_STATUS.PENDING
    | typeof TOOL_CALL_STATUS.AWAITING_APPROVAL
    | typeof TOOL_CALL_STATUS.APPROVED
    | typeof TOOL_CALL_STATUS.DENIED
    | typeof TOOL_CALL_STATUS.RUNNING
    | typeof TOOL_CALL_STATUS.SUCCEEDED
    | typeof TOOL_CALL_STATUS.FAILED;
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}
