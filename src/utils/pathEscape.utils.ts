const PATH_ESCAPE = {
  PARENT_SEGMENT: "..",
  NORMALIZED_SEPARATOR: "/",
  WINDOWS_SEPARATOR_PATTERN: /\\/g,
} as const;

const hasParentTraversalSegment = (value: string): boolean => {
  if (value === PATH_ESCAPE.PARENT_SEGMENT) {
    return true;
  }
  if (value.startsWith(`${PATH_ESCAPE.PARENT_SEGMENT}${PATH_ESCAPE.NORMALIZED_SEPARATOR}`)) {
    return true;
  }
  if (value.includes(`/${PATH_ESCAPE.PARENT_SEGMENT}/`)) {
    return true;
  }
  return value.endsWith(`/${PATH_ESCAPE.PARENT_SEGMENT}`);
};

export const isPathEscape = (value: string): boolean => {
  if (!value) return false;
  return value
    .split(/\s+/)
    .map((part) =>
      part.replace(PATH_ESCAPE.WINDOWS_SEPARATOR_PATTERN, PATH_ESCAPE.NORMALIZED_SEPARATOR)
    )
    .some((part) => hasParentTraversalSegment(part));
};
