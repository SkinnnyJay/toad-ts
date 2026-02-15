const PATHNAME_QUERY_PREFIX = "?";
const PATHNAME_HASH_PREFIX = "#";
const PATHNAME_SEPARATOR = "/";
const TRAILING_PATH_SEPARATOR_PATTERN = /\/+$/;

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
  const pathnameWithoutSuffix =
    suffixIndex === -1 ? trimmedPathname : trimmedPathname.slice(0, suffixIndex).trim();
  if (pathnameWithoutSuffix === PATHNAME_SEPARATOR) {
    return PATHNAME_SEPARATOR;
  }
  const normalizedPathname = pathnameWithoutSuffix.replace(TRAILING_PATH_SEPARATOR_PATTERN, "");
  return normalizedPathname.length > 0 ? normalizedPathname : PATHNAME_SEPARATOR;
};
