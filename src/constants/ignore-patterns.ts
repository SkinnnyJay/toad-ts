export const IGNORE_PATTERN = {
  FILE_TREE: [".git", "node_modules"],
  PROJECT_FILES: [".git", "node_modules", "dist", ".next"],
  SEARCH: [".git", "node_modules", "dist", ".next", "coverage"],
  SEARCH_GLOB_EXCLUDES: [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
  ],
} as const;

export const { FILE_TREE, PROJECT_FILES, SEARCH, SEARCH_GLOB_EXCLUDES } = IGNORE_PATTERN;
