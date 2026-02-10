import { HOOK_EVENT } from "@/constants/hook-events";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import { getHookManager } from "@/hooks/hook-service";
import type { MessageId, MessageRole, SessionId } from "@/types/domain";

export const emitStopHook = (
  sessionId: SessionId,
  messageId: MessageId,
  role: MessageRole
): void => {
  if (role !== MESSAGE_ROLE.ASSISTANT) {
    return;
  }
  const hookManager = getHookManager();
  if (!hookManager) {
    return;
  }
  void hookManager.runHooks(HOOK_EVENT.STOP, {
    matcherTarget: sessionId,
    sessionId,
    payload: { messageId },
  });
};
