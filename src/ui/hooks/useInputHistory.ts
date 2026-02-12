import { INPUT_HISTORY_MAX_SIZE } from "@/config/limits";
import { useCallback, useRef, useState } from "react";

/**
 * Input history with up/down navigation and reverse search (Ctrl+R).
 */
export const useInputHistory = () => {
  const history = useRef<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [historySize, setHistorySize] = useState(0);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const add = useCallback((entry: string) => {
    if (!entry.trim()) return;
    // Deduplicate: don't add if same as last entry
    if (history.current[history.current.length - 1] === entry) return;
    history.current.push(entry);
    if (history.current.length > INPUT_HISTORY_MAX_SIZE) {
      history.current.shift();
    }
    setHistorySize(history.current.length);
    setHistoryIndex(-1);
  }, []);

  const navigateUp = useCallback((): string | null => {
    if (history.current.length === 0) return null;
    const nextIndex = historyIndex < 0 ? history.current.length - 1 : Math.max(0, historyIndex - 1);
    setHistoryIndex(nextIndex);
    return history.current[nextIndex] ?? null;
  }, [historyIndex]);

  const navigateDown = useCallback((): string | null => {
    if (historyIndex < 0) return null;
    const nextIndex = historyIndex + 1;
    if (nextIndex >= history.current.length) {
      setHistoryIndex(-1);
      return ""; // Return to empty input
    }
    setHistoryIndex(nextIndex);
    return history.current[nextIndex] ?? null;
  }, [historyIndex]);

  const startSearch = useCallback(() => {
    setSearchMode(true);
    setSearchQuery("");
    setSearchResults([...history.current].reverse());
    setSearchIndex(0);
  }, []);

  const updateSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query) {
      setSearchResults([...history.current].reverse());
      setSearchIndex(0);
      return;
    }
    const lower = query.toLowerCase();
    const filtered = [...history.current]
      .reverse()
      .filter((entry) => entry.toLowerCase().includes(lower));
    setSearchResults(filtered);
    setSearchIndex(0);
  }, []);

  const nextSearchResult = useCallback((): string | null => {
    if (searchResults.length === 0) return null;
    const nextIdx = (searchIndex + 1) % searchResults.length;
    setSearchIndex(nextIdx);
    return searchResults[nextIdx] ?? null;
  }, [searchIndex, searchResults]);

  const acceptSearch = useCallback((): string | null => {
    setSearchMode(false);
    return searchResults[searchIndex] ?? null;
  }, [searchIndex, searchResults]);

  const cancelSearch = useCallback(() => {
    setSearchMode(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return {
    add,
    navigateUp,
    navigateDown,
    startSearch,
    updateSearch,
    nextSearchResult,
    acceptSearch,
    cancelSearch,
    searchMode,
    searchQuery,
    searchResults,
    historySize,
  };
};
