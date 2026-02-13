import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { SESSION_MODE } from "@/constants/session-modes";
import { useAppStore } from "@/store/app-store";
import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";

export function StatusLine(): ReactNode {
  const status = useAppStore((state) => state.connectionStatus);
  const sessionId = useAppStore((state) => state.currentSessionId);
  const currentSession = useAppStore((state) =>
    sessionId ? state.getSession(sessionId) : undefined
  );
  const mode = currentSession?.mode ?? SESSION_MODE.AUTO;

  return (
    <box flexDirection="row" gap={UI.SIDEBAR_PADDING}>
      <text fg={COLOR.YELLOW}>Status: {status}</text>
      <text attributes={TextAttributes.DIM}>
        {sessionId ? `Session ${sessionId}` : "No session"}
      </text>
      <text attributes={TextAttributes.DIM}>Mode: {mode}</text>
    </box>
  );
}
