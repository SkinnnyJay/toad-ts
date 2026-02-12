import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import type { ModelInfo } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

interface SessionModelTabProps {
  isActive: boolean;
  availableModels: ModelInfo[];
  currentModelId?: string;
  onSelectModel?: (modelId: string) => Promise<void>;
}

const toNormalizedOptionalString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized;
};

export function SessionModelTab({
  isActive,
  availableModels,
  currentModelId,
  onSelectModel,
}: SessionModelTabProps): ReactNode {
  const [index, setIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const normalizedCurrentModelId = toNormalizedOptionalString(currentModelId);
  const currentModelIndex = useMemo(
    () => availableModels.findIndex((model) => model.modelId === normalizedCurrentModelId),
    [availableModels, normalizedCurrentModelId]
  );

  useEffect(() => {
    if (currentModelIndex >= 0) {
      setIndex(currentModelIndex);
      return;
    }
    if (availableModels.length === 0) {
      setIndex(0);
      return;
    }
    setIndex((previousIndex) => Math.min(previousIndex, availableModels.length - 1));
  }, [availableModels.length, currentModelIndex]);

  const handleSelectModel = async (modelId: string): Promise<void> => {
    if (!onSelectModel) {
      setStatusMessage("Model switching is not available for the active provider.");
      return;
    }
    if (modelId === normalizedCurrentModelId) {
      setStatusMessage(`Model ${modelId} is already active.`);
      return;
    }
    setIsSaving(true);
    setStatusMessage(`Switching model to ${modelId}…`);
    try {
      await onSelectModel(modelId);
      setStatusMessage(`Updated session model to ${modelId}.`);
    } catch (error) {
      setStatusMessage(
        `Failed to update model: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  useKeyboard((key) => {
    if (!isActive) {
      return;
    }
    if (isSaving || availableModels.length === 0) {
      return;
    }
    if (key.name === KEY_NAME.UP) {
      key.preventDefault();
      key.stopPropagation();
      setIndex(
        (previousIndex) => (previousIndex - 1 + availableModels.length) % availableModels.length
      );
      return;
    }
    if (key.name === KEY_NAME.DOWN) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((previousIndex) => (previousIndex + 1) % availableModels.length);
      return;
    }
    if (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) {
      key.preventDefault();
      key.stopPropagation();
      const targetModel = availableModels[index];
      if (!targetModel) {
        return;
      }
      void handleSelectModel(targetModel.modelId);
    }
  });

  if (!isActive) {
    return null;
  }

  return (
    <box flexDirection="column" gap={1} paddingTop={1} paddingBottom={1}>
      <text attributes={TextAttributes.BOLD}>Session Model</text>
      <text attributes={TextAttributes.DIM}>
        Select the active model for this session. Press Enter to apply.
      </text>
      {availableModels.length === 0 ? (
        <box flexDirection="column" gap={1} marginTop={1}>
          <text attributes={TextAttributes.DIM}>No models cached for this session yet.</text>
          <text attributes={TextAttributes.DIM}>Run /models to fetch and cache model options.</text>
        </box>
      ) : (
        <box flexDirection="column" gap={0} marginTop={1}>
          {availableModels.map((model, modelIndex) => {
            const isSelected = modelIndex === index;
            const isCurrent = model.modelId === normalizedCurrentModelId;
            return (
              <box key={model.modelId} flexDirection="row" justifyContent="space-between">
                <text fg={isSelected ? COLOR.GREEN : isCurrent ? COLOR.CYAN : undefined}>
                  {isSelected ? "› " : "  "}
                  {isCurrent && !isSelected ? "● " : "  "}
                  {model.name}
                </text>
                <text fg={COLOR.GRAY}>{model.modelId}</text>
              </box>
            );
          })}
        </box>
      )}
      {statusMessage ? (
        <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
          <text attributes={TextAttributes.DIM}>{statusMessage}</text>
        </box>
      ) : null}
    </box>
  );
}
