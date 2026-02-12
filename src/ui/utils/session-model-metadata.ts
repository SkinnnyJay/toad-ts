import type { ModelInfo, Session, SessionMetadata } from "@/types/domain";

export const toNormalizedOptionalString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized;
};

const toSessionMetadataBase = (session: Session): SessionMetadata => {
  return {
    ...(session.metadata ?? { mcpServers: [] }),
    mcpServers: session.metadata?.mcpServers ?? [],
  };
};

export const withSessionModel = (session: Session, modelId: string): Session => {
  const metadata = {
    ...toSessionMetadataBase(session),
    model: modelId,
  };
  return {
    ...session,
    metadata,
  };
};

export const withSessionAvailableModels = (
  session: Session,
  options: {
    availableModels: ModelInfo[];
    fallbackModelId?: string;
  }
): Session => {
  const existingModel = toNormalizedOptionalString(session.metadata?.model);
  const fallbackModelId = toNormalizedOptionalString(options.fallbackModelId);
  const model = existingModel ?? fallbackModelId;
  const metadata = {
    ...toSessionMetadataBase(session),
    ...(model ? { model } : {}),
    availableModels: options.availableModels,
  };
  return {
    ...session,
    metadata,
  };
};
