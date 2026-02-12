import { parseModelsCommandResult } from "@/core/agent-management/models-command-result";
import type { AgentManagementCommandResult } from "@/types/agent-management.types";
import type { CursorCloudModelsResponse } from "@/types/cursor-cloud.types";
import type { ModelInfo } from "@/types/domain";

export interface SessionModelOptions {
  availableModels: ModelInfo[];
  defaultModelId?: string;
}

interface ResolveSessionModelOptionsParams {
  runCommand?: () => Promise<AgentManagementCommandResult>;
  runCloud?: () => Promise<CursorCloudModelsResponse>;
}

const toErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

export const toSessionModelOptionsFromCommandResult = (
  result: AgentManagementCommandResult
): SessionModelOptions => {
  const parsed = parseModelsCommandResult(result);
  const defaultModelId = parsed.models.find((model) => model.isDefault)?.id;
  return {
    availableModels: parsed.models.map((model) => ({
      modelId: model.id,
      name: model.name,
    })),
    defaultModelId,
  };
};

export const toSessionModelOptionsFromCloudResponse = (
  response: CursorCloudModelsResponse
): SessionModelOptions => {
  const defaultModelId = response.models.find((model) => model.default)?.id;
  return {
    availableModels: response.models.map((model) => ({
      modelId: model.id,
      name: model.name ?? model.id,
    })),
    defaultModelId,
  };
};

export const resolveSessionModelOptions = async ({
  runCommand,
  runCloud,
}: ResolveSessionModelOptionsParams): Promise<SessionModelOptions> => {
  const errors: string[] = [];
  if (runCommand) {
    try {
      const result = await runCommand();
      return toSessionModelOptionsFromCommandResult(result);
    } catch (error) {
      errors.push(toErrorMessage(error));
    }
  }

  if (runCloud) {
    try {
      const response = await runCloud();
      return toSessionModelOptionsFromCloudResponse(response);
    } catch (error) {
      errors.push(toErrorMessage(error));
    }
  }

  if (errors.length > 0) {
    throw new Error(`Model listing failed: ${errors.join(" | ")}`);
  }
  throw new Error("Model listing is not available for the active provider.");
};
