const UNKNOWN_CONTEXT_VALUE = "unknown";

export interface CloudDispatchContext {
  repository?: string;
  branch?: string;
}

export interface RepoWorkflowCloudDispatchInput {
  owner?: string;
  repoName?: string;
  branch?: string;
}

export const toNormalizedCloudDispatchContextValue = (
  value: string | undefined
): string | undefined => {
  const normalized = value?.trim();
  if (!normalized || normalized.toLowerCase() === UNKNOWN_CONTEXT_VALUE) {
    return undefined;
  }
  return normalized;
};

export const toCloudDispatchContextFromRepoWorkflow = (
  info: RepoWorkflowCloudDispatchInput | null | undefined
): CloudDispatchContext | undefined => {
  if (!info) {
    return undefined;
  }
  const owner = toNormalizedCloudDispatchContextValue(info.owner);
  const repoName = toNormalizedCloudDispatchContextValue(info.repoName);
  const branch = toNormalizedCloudDispatchContextValue(info.branch);

  const repository = repoName ? (owner ? `${owner}/${repoName}` : repoName) : undefined;
  if (!repository && !branch) {
    return undefined;
  }

  return {
    ...(repository ? { repository } : {}),
    ...(branch ? { branch } : {}),
  };
};
