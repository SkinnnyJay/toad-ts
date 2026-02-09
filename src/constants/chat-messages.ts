export const CHAT_MESSAGE = {
  READ_ONLY_WARNING: "Session is read-only; prompts are blocked.",
  INTERACTIVE_BACKGROUND_WARNING:
    "Interactive commands cannot be backgrounded; running in foreground.",
  INTERACTIVE_SHELL_COMPLETE: "Interactive command finished.",
  SUBAGENT_DELEGATING: "Delegating prompt to subagent:",
  SUBAGENT_COMPLETE: "Subagent response available in session:",
  SUBAGENT_FAILED: "Subagent invocation failed:",
  SUBAGENT_NO_SESSION: "Subagent invocation requires an active session.",
} as const;
