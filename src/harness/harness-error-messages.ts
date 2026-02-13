export const formatHarnessNotConfiguredError = (harnessId: string): string => {
  return `Harness '${harnessId}' not configured.`;
};

export const formatHarnessAdapterNotRegisteredError = (harnessId: string): string => {
  return `Harness adapter '${harnessId}' not registered.`;
};

export const formatHarnessNotFoundError = (harnessId: string): string => {
  return `Harness '${harnessId}' not found.`;
};
