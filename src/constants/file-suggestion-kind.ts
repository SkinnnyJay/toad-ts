export const FILE_SUGGESTION_KIND = {
  FILE: "file",
  FOLDER: "folder",
} as const;

export type FileSuggestionKind = (typeof FILE_SUGGESTION_KIND)[keyof typeof FILE_SUGGESTION_KIND];

export const { FILE, FOLDER } = FILE_SUGGESTION_KIND;
