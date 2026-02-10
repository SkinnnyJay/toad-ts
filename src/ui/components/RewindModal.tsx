import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { REWIND_MODE, type RewindMode } from "@/constants/rewind-modes";
import type { CheckpointStatus } from "@/store/checkpoints/checkpoint-manager";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useMemo, useState } from "react";

interface RewindModalProps {
  isOpen: boolean;
  checkpointStatus?: CheckpointStatus;
  onClose: () => void;
  onSelect: (mode: RewindMode) => void;
}

const REWIND_OPTIONS: Array<{ mode: RewindMode; label: string; description: string }> = [
  {
    mode: REWIND_MODE.BOTH,
    label: "Rewind (code + conversation)",
    description: "Restore files and chat history to the previous checkpoint.",
  },
  {
    mode: REWIND_MODE.CONVERSATION,
    label: "Rewind conversation only",
    description: "Restore messages but keep current files untouched.",
  },
  {
    mode: REWIND_MODE.CODE,
    label: "Rewind code only",
    description: "Restore files but keep current conversation.",
  },
  {
    mode: REWIND_MODE.SUMMARIZE,
    label: "Summarize and rewind conversation",
    description: "Restore conversation and request a summary agent.",
  },
];

export function RewindModal({
  isOpen,
  checkpointStatus,
  onClose,
  onSelect,
}: RewindModalProps): ReactNode {
  const symbols = useUiSymbols();
  const [index, setIndex] = useState(0);
  const options = useMemo(() => REWIND_OPTIONS, []);
  const checkpointText =
    checkpointStatus && checkpointStatus.total > 0
      ? `Checkpoint ${checkpointStatus.cursor}/${checkpointStatus.total}`
      : "No checkpoints";

  useKeyboard((key) => {
    if (!isOpen) return;
    if (options.length === 0) return;

    if (key.name === "up") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - 1 + options.length) % options.length);
      return;
    }
    if (key.name === "down") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + 1) % options.length);
      return;
    }
    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      key.stopPropagation();
      const selected = options[index];
      if (selected) {
        onSelect(selected.mode);
      }
      return;
    }
    if (key.name === "escape") {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  if (!isOpen) return null;
  const contentMinHeight = UI.POPUP_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

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
      minHeight={UI.POPUP_HEIGHT}
      width={UI.POPUP_WIDTH}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Rewind (Esc to close)
        </text>
        <text attributes={TextAttributes.DIM}>{checkpointText}</text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight} gap={1}>
        {options.map((option, idx) => {
          const isSelected = idx === index;
          return (
            <box key={option.mode} flexDirection="column" paddingLeft={1} paddingRight={1}>
              <text fg={isSelected ? COLOR.GREEN : COLOR.WHITE}>
                {isSelected ? `${symbols.CHEVRON} ` : "  "}
                {option.label}
              </text>
              <text attributes={TextAttributes.DIM}>{option.description}</text>
            </box>
          );
        })}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>↑/↓: Navigate | Enter: Rewind | Esc: Close</text>
      </box>
    </box>
  );
}
