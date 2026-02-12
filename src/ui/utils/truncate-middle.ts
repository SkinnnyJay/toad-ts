export const truncateMiddle = (value: string, max: number): string => {
  if (value.length <= max) {
    return value;
  }
  const half = Math.floor((max - 3) / 2);
  return `${value.slice(0, half)}...${value.slice(-half)}`;
};
