import { DEBOUNCE_MS, LIMIT, MENTION_QUERY_REGEX } from "@/constants/mention-suggestions";
import fuzzysort from "fuzzysort";
import { useEffect, useMemo, useState } from "react";

export interface UseMentionSuggestionsOptions {
  enabled?: boolean;
  value: string;
  cursorPosition: number;
  filePaths: string[];
  suggestionLimit?: number;
  debounceMs?: number;
}

export interface UseMentionSuggestionsResult {
  suggestions: string[];
  selectedIndex: number;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  mentionQuery: string | null;
  hasSuggestions: boolean;
}

/**
 * Extracts the @-mention query from text before cursor.
 */
export const extractMentionQuery = (value: string, cursorPosition: number): string | null => {
  const beforeCursor = value.slice(0, cursorPosition);
  const match = beforeCursor.match(MENTION_QUERY_REGEX);
  return match ? (match[1] ?? null) : null;
};

/**
 * Hook to provide fuzzy-matched file suggestions for @-mentions.
 * Debounces the search to avoid excessive computation.
 */
export function useMentionSuggestions({
  enabled = true,
  value,
  cursorPosition,
  filePaths,
  suggestionLimit = LIMIT,
  debounceMs = DEBOUNCE_MS,
}: UseMentionSuggestionsOptions): UseMentionSuggestionsResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Detect active @ mention token before cursor
  const mentionQuery = useMemo(() => {
    if (!enabled) return null;
    return extractMentionQuery(value, cursorPosition);
  }, [enabled, value, cursorPosition]);

  // Debounced fuzzy search
  useEffect(() => {
    if (!enabled || !mentionQuery) {
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    if (filePaths.length === 0) {
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    const handle = setTimeout(() => {
      const results = fuzzysort.go(mentionQuery, filePaths, {
        limit: suggestionLimit,
      });
      setSuggestions(results.map((r) => r.target));
      setSelectedIndex(0);
    }, debounceMs);

    return () => clearTimeout(handle);
  }, [enabled, filePaths, mentionQuery, suggestionLimit, debounceMs]);

  return {
    suggestions,
    selectedIndex,
    setSelectedIndex,
    mentionQuery,
    hasSuggestions: suggestions.length > 0,
  };
}
