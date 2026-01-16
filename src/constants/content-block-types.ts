export const CONTENT_BLOCK_TYPE = {
  TEXT: "text",
  CODE: "code",
  THINKING: "thinking",
  TOOL_CALL: "tool_call",
  RESOURCE_LINK: "resource_link",
  RESOURCE: "resource",
} as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPE)[keyof typeof CONTENT_BLOCK_TYPE];

// Re-export for convenience
export const { TEXT, CODE, THINKING, TOOL_CALL, RESOURCE_LINK, RESOURCE } = CONTENT_BLOCK_TYPE;
