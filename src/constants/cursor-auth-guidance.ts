export const CURSOR_AUTH_GUIDANCE = {
  LOGIN_REQUIRED:
    "Cursor CLI is not authenticated. Run `cursor-agent login` or set CURSOR_API_KEY.",
} as const;

export type CursorAuthGuidance = (typeof CURSOR_AUTH_GUIDANCE)[keyof typeof CURSOR_AUTH_GUIDANCE];

export const { LOGIN_REQUIRED } = CURSOR_AUTH_GUIDANCE;
