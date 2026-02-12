import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { SESSION_MODE, type SessionMode } from "@/constants/session-modes";
import { toErrorMessage } from "@/ui/utils/auth-error-matcher";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const SESSION_MODE_OPTION = [
  {
    id: SESSION_MODE.AUTO,
    label: "Auto",
    description: "Prompts for write/exec permissions when needed.",
  },
  {
    id: SESSION_MODE.READ_ONLY,
    label: "Read-only",
    description: "Blocks writes/exec actions and keeps session safe.",
  },
  {
    id: SESSION_MODE.FULL_ACCESS,
    label: "Full access",
    description: "Auto-approves write and exec actions for faster workflows.",
  },
] as const;

interface SessionModeTabProps {
  isActive: boolean;
  currentMode: SessionMode;
  onSelectMode?: (mode: SessionMode) => Promise<void>;
}

export function SessionModeTab({
  isActive,
  currentMode,
  onSelectMode,
}: SessionModeTabProps): ReactNode {
  const [index, setIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const currentModeIndex = useMemo(
    () => SESSION_MODE_OPTION.findIndex((option) => option.id === currentMode),
    [currentMode]
  );

  useEffect(() => {
    if (currentModeIndex >= 0) {
      setIndex(currentModeIndex);
    }
  }, [currentModeIndex]);

  useKeyboard((key) => {
    if (!isActive || isSaving) {
      return;
    }
    if (key.name === KEY_NAME.UP) {
      key.preventDefault();
      key.stopPropagation();
      setIndex(
        (previousIndex) =>
          (previousIndex - 1 + SESSION_MODE_OPTION.length) % SESSION_MODE_OPTION.length
      );
      return;
    }
    if (key.name === KEY_NAME.DOWN) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((previousIndex) => (previousIndex + 1) % SESSION_MODE_OPTION.length);
      return;
    }
    if (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) {
      key.preventDefault();
      key.stopPropagation();
      const targetMode = SESSION_MODE_OPTION[index];
      if (!targetMode) {
        return;
      }
      if (!onSelectMode) {
        setStatusMessage("Session mode switching is not available for the active provider.");
        return;
      }
      if (targetMode.id === currentMode) {
        setStatusMessage(`Mode ${targetMode.id} is already active.`);
        return;
      }
      setIsSaving(true);
      setStatusMessage(`Switching mode to ${targetMode.id}…`);
      void onSelectMode(targetMode.id)
        .then(() => {
          setStatusMessage(`Updated session mode to ${targetMode.id}.`);
        })
        .catch((error) => {
          const details = toErrorMessage(error) ?? String(error);
          setStatusMessage(`Failed to update mode: ${details}`);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  });

  if (!isActive) {
    return null;
  }

  return (
    <box flexDirection="column" gap={1} paddingTop={1} paddingBottom={1}>
      <text attributes={TextAttributes.BOLD}>Session Mode</text>
      <text attributes={TextAttributes.DIM}>
        Select how this session handles tool permissions. Press Enter to apply.
      </text>
      <box flexDirection="column" gap={0} marginTop={1}>
        {SESSION_MODE_OPTION.map((option, optionIndex) => {
          const isSelected = optionIndex === index;
          const isCurrent = option.id === currentMode;
          return (
            <box key={option.id} flexDirection="column" marginBottom={1}>
              <text fg={isSelected ? COLOR.GREEN : isCurrent ? COLOR.CYAN : undefined}>
                {isSelected ? "› " : "  "}
                {isCurrent && !isSelected ? "● " : "  "}
                {option.label} ({option.id})
              </text>
              <text attributes={TextAttributes.DIM}>{option.description}</text>
            </box>
          );
        })}
      </box>
      {statusMessage ? (
        <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
          <text attributes={TextAttributes.DIM}>{statusMessage}</text>
        </box>
      ) : null}
    </box>
  );
}
