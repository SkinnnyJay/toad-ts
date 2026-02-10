import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { ScrollArea } from "@/ui/components/ScrollArea";
import { useContextStats } from "@/ui/hooks/useContextStats";
import { useProjectFiles } from "@/ui/hooks/useProjectFiles";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ContextProgress } from "./ContextProgress";

interface ContextModalProps {
  isOpen: boolean;
  sessionId?: SessionId;
  onClose: () => void;
}

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
};

export function ContextModal({ isOpen, sessionId, onClose }: ContextModalProps): ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { filePaths, isLoading, error } = useProjectFiles({ enabled: isOpen });
  const contextStats = useContextStats(sessionId);
  const attachments = useAppStore((state) =>
    sessionId ? state.getContextAttachments(sessionId) : []
  );
  const setContextAttachments = useAppStore((state) => state.setContextAttachments);

  const list = useMemo(() => filePaths.slice(0, LIMIT.MAX_FILES), [filePaths]);

  useEffect(() => {
    if (selectedIndex >= list.length) {
      setSelectedIndex(0);
    }
  }, [list.length, selectedIndex]);

  const toggleAttachment = (file: string): void => {
    if (!sessionId) return;
    const hasFile = attachments.includes(file);
    const next = hasFile
      ? attachments.filter((item) => item !== file)
      : [...attachments, file].sort();
    setContextAttachments(sessionId, next);
  };

  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === "escape" || (key.ctrl && key.name === "s")) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
      return;
    }
    if (!sessionId || list.length === 0) {
      return;
    }
    if (key.name === "up") {
      key.preventDefault();
      key.stopPropagation();
      setSelectedIndex((prev) => (prev - 1 + list.length) % list.length);
      return;
    }
    if (key.name === "down") {
      key.preventDefault();
      key.stopPropagation();
      setSelectedIndex((prev) => (prev + 1) % list.length);
      return;
    }
    if (key.name === "return" || key.name === "linefeed" || key.name === "space") {
      key.preventDefault();
      key.stopPropagation();
      const target = list[selectedIndex];
      if (target) {
        toggleAttachment(target);
      }
    }
  });

  if (!isOpen) return null;

  const contentMinHeight = UI.MODAL_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      minHeight={UI.MODAL_HEIGHT}
      width={UI.MODAL_WIDTH}
      gap={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Context Attachments (Esc/Ctrl+S to close)
        </text>
      </box>

      {contextStats ? (
        <ContextProgress tokens={contextStats.tokens} limit={contextStats.limit} label="Ctx" />
      ) : (
        <text attributes={TextAttributes.DIM}>No active session.</text>
      )}

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
        {isLoading ? (
          <text attributes={TextAttributes.DIM}>Loading project files…</text>
        ) : error ? (
          <text fg={COLOR.RED}>Failed to load files: {error}</text>
        ) : list.length === 0 ? (
          <text attributes={TextAttributes.DIM}>No files detected.</text>
        ) : (
          <ScrollArea height={contentMinHeight} viewportCulling={true}>
            <box flexDirection="column" gap={0}>
              {list.map((file, index) => {
                const isSelected = index === selectedIndex;
                const isAttached = attachments.includes(file);
                return (
                  <text
                    key={file}
                    fg={isSelected ? COLOR.GREEN : COLOR.WHITE}
                    attributes={isAttached ? TextAttributes.BOLD : undefined}
                  >
                    {isSelected ? "› " : "  "}
                    {isAttached ? "✓ " : "  "}
                    {truncateText(file, LIMIT.SIDEBAR_TRUNCATE_LENGTH)}
                  </text>
                );
              })}
            </box>
          </ScrollArea>
        )}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>
          ↑/↓ select, Enter/Space toggle attachment, Esc/Ctrl+S close
        </text>
      </box>
    </box>
  );
}
