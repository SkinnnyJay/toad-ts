export const MENTION_QUERY_REGEX = /@([\w./-]*)$/;

export const MENTION_SUGGESTION = {
  LIMIT: 8,
  DEBOUNCE_MS: 150,
} as const;

export type MentionSuggestionConfig = typeof MENTION_SUGGESTION;

export const { LIMIT, DEBOUNCE_MS } = MENTION_SUGGESTION;
