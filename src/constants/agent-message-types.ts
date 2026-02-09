export const AGENT_MESSAGE_TYPE = {
  TASK_COMPLETE: "task_complete",
  TASK_FAILED: "task_failed",
  NEED_HELP: "need_help",
  SHARE_RESULT: "share_result",
  COORDINATE: "coordinate",
} as const;

export type AgentMessageType = (typeof AGENT_MESSAGE_TYPE)[keyof typeof AGENT_MESSAGE_TYPE];

export const { TASK_COMPLETE, TASK_FAILED, NEED_HELP, SHARE_RESULT, COORDINATE } =
  AGENT_MESSAGE_TYPE;
