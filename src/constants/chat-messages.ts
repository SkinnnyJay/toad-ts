export const CHAT_MESSAGE = {
  READ_ONLY_WARNING: "Session is read-only; prompts are blocked.",
  INTERACTIVE_BACKGROUND_WARNING:
    "Interactive commands cannot be backgrounded; running in foreground.",
  INTERACTIVE_SHELL_COMPLETE: "Interactive command finished.",
  SUBAGENT_DELEGATING: "Delegating prompt to subagent:",
  SUBAGENT_COMPLETE: "Subagent response available in session:",
  SUBAGENT_FAILED: "Subagent invocation failed:",
  SUBAGENT_NO_SESSION: "Subagent invocation requires an active session.",
  CLOUD_DISPATCH_USAGE: "Cloud dispatch requires a prompt after '&'.",
  CLOUD_DISPATCH_UNSUPPORTED: "Cloud dispatch requires a Cursor CLI agent session.",
  CLOUD_DISPATCH_STARTING: "Dispatching prompt to Cursor Cloud agent…",
  CLOUD_DISPATCH_STARTED: "Cursor Cloud agent started:",
  CLOUD_DISPATCH_FAILED: "Cloud dispatch failed:",
  CLOUD_DISPATCH_MISSING_API_KEY: "Cloud dispatch requires CURSOR_API_KEY.",
  CLOUD_DISPATCH_AUTH_REQUIRED:
    "Cloud dispatch requires authentication. Run `cursor-agent login` or set CURSOR_API_KEY.",
} as const;
