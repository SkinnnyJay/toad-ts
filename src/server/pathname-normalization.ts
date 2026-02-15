const PATHNAME_QUERY_PREFIX = "?";
const PATHNAME_HASH_PREFIX = "#";

const resolvePathSuffixIndex = (pathname: string): number => {
  const queryIndex = pathname.indexOf(PATHNAME_QUERY_PREFIX);
  const hashIndex = pathname.indexOf(PATHNAME_HASH_PREFIX);
  if (queryIndex === -1) {
    return hashIndex;
  }
  if (hashIndex === -1) {
    return queryIndex;
  }
  return Math.min(queryIndex, hashIndex);
};

export const normalizeRoutePathname = (pathname: string): string => {
  const trimmedPathname = pathname.trim();
  const suffixIndex = resolvePathSuffixIndex(trimmedPathname);
  if (suffixIndex === -1) {
    return trimmedPathname;
  }
  return trimmedPathname.slice(0, suffixIndex).trim();
};
