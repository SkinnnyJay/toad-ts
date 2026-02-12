import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import type { ModelInfo } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

interface SessionModelTabProps {
  isActive: boolean;
  availableModels: ModelInfo[];
  currentModelId?: string;
  onSelectModel?: (modelId: string) => Promise<void>;
  onRefreshModels?: () => Promise<void>;
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
  onRefreshModels,
}: SessionModelTabProps): ReactNode {
  const [index, setIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAttemptedAutoRefresh, setHasAttemptedAutoRefresh] = useState(false);
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

  const handleSelectModel = useCallback(
    async (modelId: string): Promise<void> => {
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
    },
    [normalizedCurrentModelId, onSelectModel]
  );

  const handleRefreshModels = useCallback(async (): Promise<void> => {
    if (!onRefreshModels) {
      setStatusMessage("Model refresh is not available for the active provider.");
      return;
    }
    setIsRefreshing(true);
    setStatusMessage("Refreshing model list…");
    try {
      await onRefreshModels();
      setStatusMessage("Refreshed model list.");
    } catch (error) {
      setStatusMessage(
        `Failed to refresh models: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshModels]);

  useEffect(() => {
    if (availableModels.length > 0 && hasAttemptedAutoRefresh) {
      setHasAttemptedAutoRefresh(false);
    }
  }, [availableModels.length, hasAttemptedAutoRefresh]);

  useEffect(() => {
    if (
      !isActive ||
      hasAttemptedAutoRefresh ||
      availableModels.length > 0 ||
      !onRefreshModels ||
      isSaving ||
      isRefreshing
    ) {
      return;
    }
    setHasAttemptedAutoRefresh(true);
    void handleRefreshModels();
  }, [
    availableModels.length,
    handleRefreshModels,
    hasAttemptedAutoRefresh,
    isActive,
    isRefreshing,
    isSaving,
    onRefreshModels,
  ]);

  useKeyboard((key) => {
    if (!isActive) {
      return;
    }
    if (key.ctrl && key.name === KEY_NAME.R) {
      key.preventDefault();
      key.stopPropagation();
      if (isSaving || isRefreshing) {
        return;
      }
      void handleRefreshModels();
      return;
    }
    if (isSaving || isRefreshing || availableModels.length === 0) {
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
      <text attributes={TextAttributes.DIM}>Ctrl+R refreshes model options from the CLI.</text>
      {availableModels.length === 0 ? (
        <box flexDirection="column" gap={1} marginTop={1}>
          <text attributes={TextAttributes.DIM}>No models cached for this session yet.</text>
          <text attributes={TextAttributes.DIM}>
            TOADSTOOL will try to refresh automatically; press Ctrl+R to retry.
          </text>
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
