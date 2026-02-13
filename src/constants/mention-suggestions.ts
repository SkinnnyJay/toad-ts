import { LIMIT as APP_LIMIT } from "@/config/limits";

export const MENTION_QUERY_REGEX = /@([\w./-]*)$/;

export const MENTION_SUGGESTION = {
  LIMIT: APP_LIMIT.MENTION_SUGGESTION_LIMIT,
  DEBOUNCE_MS: APP_LIMIT.MENTION_SUGGESTION_DEBOUNCE_MS,
} as const;

export type MentionSuggestionConfig = typeof MENTION_SUGGESTION;

export const { LIMIT, DEBOUNCE_MS } = MENTION_SUGGESTION;
