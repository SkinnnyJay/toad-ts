/** Prefix for file context references in chat input (e.g. @foo.ts). */
export const FILE_REF_PREFIX = "@" as const;

/**
 * Format a filename as a file context ref for the chat input.
 */
export function formatFileRefForInput(filename: string): string {
  return `${FILE_REF_PREFIX}${filename}`;
}
