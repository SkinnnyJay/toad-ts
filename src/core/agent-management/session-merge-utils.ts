export const pickPreferredTitle = (
  existingTitle: string | undefined,
  incomingTitle: string | undefined
): string | undefined => {
  if (!existingTitle) {
    return incomingTitle;
  }
  if (!incomingTitle) {
    return existingTitle;
  }
  return incomingTitle.length > existingTitle.length ? incomingTitle : existingTitle;
};

export const pickPreferredCreatedAt = (
  existingCreatedAt: string | undefined,
  incomingCreatedAt: string | undefined
): string | undefined => {
  if (!existingCreatedAt) {
    return incomingCreatedAt;
  }
  if (!incomingCreatedAt) {
    return existingCreatedAt;
  }
  const existingTimestamp = Date.parse(existingCreatedAt);
  const incomingTimestamp = Date.parse(incomingCreatedAt);
  if (Number.isNaN(existingTimestamp)) {
    return incomingCreatedAt;
  }
  if (Number.isNaN(incomingTimestamp)) {
    return existingCreatedAt;
  }
  return incomingTimestamp > existingTimestamp ? incomingCreatedAt : existingCreatedAt;
};

export const pickPreferredMessageCount = (
  existingMessageCount: number | undefined,
  incomingMessageCount: number | undefined
): number | undefined => {
  if (existingMessageCount === undefined) {
    return incomingMessageCount;
  }
  if (incomingMessageCount === undefined) {
    return existingMessageCount;
  }
  return Math.max(existingMessageCount, incomingMessageCount);
};
