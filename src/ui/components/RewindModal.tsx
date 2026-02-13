import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { REWIND_MODAL_OPTION_KIND } from "@/constants/rewind-modal-option-kinds";
import { REWIND_MODE, type RewindMode } from "@/constants/rewind-modes";
import type { CheckpointStatus } from "@/store/checkpoints/checkpoint-manager";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { normalizeKeyName } from "@/ui/keybinds/keybinds";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const REWIND_MODAL_SELECTION_OPTIONS_LABEL = "Go to selection options";
const REWIND_MODAL_SELECTION_OPTIONS_DESCRIPTION = "Switch agent or model (agent/model picker).";

interface RewindModalProps {
  isOpen: boolean;
  checkpointStatus?: CheckpointStatus;
  onClose: () => void;
  onSelect: (mode: RewindMode) => void;
  onGoToSelectionOptions?: () => void;
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

type ModalOption =
  | { kind: typeof REWIND_MODAL_OPTION_KIND.SELECTION }
  | {
      kind: typeof REWIND_MODAL_OPTION_KIND.REWIND;
      mode: RewindMode;
      label: string;
      description: string;
    };

export function RewindModal({
  isOpen,
  checkpointStatus,
  onClose,
  onSelect,
  onGoToSelectionOptions,
}: RewindModalProps): ReactNode {
  const symbols = useUiSymbols();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);
  const options = useMemo((): ModalOption[] => {
    const rewind: ModalOption[] = REWIND_OPTIONS.map((o) => ({
      kind: REWIND_MODAL_OPTION_KIND.REWIND,
      mode: o.mode,
      label: o.label,
      description: o.description,
    }));
    if (onGoToSelectionOptions) {
      return [{ kind: REWIND_MODAL_OPTION_KIND.SELECTION }, ...rewind];
    }
    return rewind;
  }, [onGoToSelectionOptions]);
  const checkpointText =
    checkpointStatus && checkpointStatus.total > 0
      ? `Checkpoint ${checkpointStatus.cursor}/${checkpointStatus.total}`
      : "No checkpoints";

  useKeyboard((key) => {
    if (!isOpen) return;
    if (options.length === 0) return;

    const keyName = normalizeKeyName(key.name);

    if (keyName === KEY_NAME.UP) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - 1 + options.length) % options.length);
      return;
    }
    if (keyName === KEY_NAME.DOWN) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + 1) % options.length);
      return;
    }
    if (keyName === KEY_NAME.RETURN || keyName === KEY_NAME.LINEFEED) {
      key.preventDefault();
      key.stopPropagation();
      const selected = options[index];
      if (!selected) return;
      if (selected.kind === REWIND_MODAL_OPTION_KIND.SELECTION && onGoToSelectionOptions) {
        onGoToSelectionOptions();
        return;
      }
      if (selected.kind === REWIND_MODAL_OPTION_KIND.REWIND) {
        onSelect(selected.mode);
      }
      return;
    }
    if (keyName === KEY_NAME.ESCAPE) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  if (!isOpen) return null;
  const contentMinHeight = UI.POPUP_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

  return (
    <box
      width="100%"
      height="100%"
      flexGrow={1}
      minHeight={0}
      justifyContent="center"
      alignItems="center"
    >
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
            const label =
              option.kind === REWIND_MODAL_OPTION_KIND.SELECTION
                ? REWIND_MODAL_SELECTION_OPTIONS_LABEL
                : option.label;
            const description =
              option.kind === REWIND_MODAL_OPTION_KIND.SELECTION
                ? REWIND_MODAL_SELECTION_OPTIONS_DESCRIPTION
                : option.description;
            const optionKey =
              option.kind === REWIND_MODAL_OPTION_KIND.SELECTION
                ? REWIND_MODAL_OPTION_KIND.SELECTION
                : option.mode;
            return (
              <box key={optionKey} flexDirection="column" paddingLeft={1} paddingRight={1}>
                <text fg={isSelected ? COLOR.GREEN : COLOR.WHITE}>
                  {isSelected ? `${symbols.CHEVRON} ` : "  "}
                  {label}
                </text>
                <text attributes={TextAttributes.DIM}>{description}</text>
              </box>
            );
          })}
        </box>

        <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
          <text attributes={TextAttributes.DIM}>↑/↓: Navigate | Enter: Select | Esc: Close</text>
        </box>
      </box>
    </box>
  );
}
