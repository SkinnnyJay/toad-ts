const INVALID_CLOUD_TIMESTAMP = -1;

export interface CloudAgentRecencyItem {
  id: string;
  updatedAt?: string;
}

export const toSortableCloudTimestamp = (value: string | undefined): number => {
  if (!value) {
    return INVALID_CLOUD_TIMESTAMP;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return INVALID_CLOUD_TIMESTAMP;
  }
  return timestamp;
};

export const sortCloudAgentItemsByRecency = <TItem extends CloudAgentRecencyItem>(
  items: readonly TItem[]
): TItem[] => {
  return [...items].sort((first, second) => {
    const secondTimestamp = toSortableCloudTimestamp(second.updatedAt);
    const firstTimestamp = toSortableCloudTimestamp(first.updatedAt);
    if (secondTimestamp !== firstTimestamp) {
      return secondTimestamp - firstTimestamp;
    }
    return first.id.localeCompare(second.id);
  });
};
