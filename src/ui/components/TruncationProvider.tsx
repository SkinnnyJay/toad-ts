import { KEY_NAME } from "@/constants/key-names";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type TruncationEntry = {
  id: string;
  label: string;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
};

interface TruncationContextValue {
  register: (entry: TruncationEntry) => () => void;
  isActive: (id: string) => boolean;
  entryCount: number;
}

const TruncationContext = createContext<TruncationContextValue>({
  register: () => () => {},
  isActive: () => false,
  entryCount: 0,
});

export const TRUNCATION_SHORTCUT_HINT =
  "Ctrl+↑/↓ select · Ctrl+Enter toggle · Ctrl+E expand · Ctrl+Shift+E collapse";

export function TruncationProvider({ children }: { children: ReactNode }): ReactNode {
  const [entries, setEntries] = useState<TruncationEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const register = useCallback((entry: TruncationEntry) => {
    setEntries((prev) => {
      const next = prev.filter((item) => item.id !== entry.id);
      next.push(entry);
      return next;
    });
    return () => {
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    };
  }, []);

  useEffect(() => {
    if (activeIndex >= entries.length) {
      setActiveIndex(entries.length === 0 ? 0 : entries.length - 1);
    }
  }, [activeIndex, entries.length]);

  useKeyboard((key) => {
    if (!key.ctrl || entries.length === 0) return;

    if (key.name === KEY_NAME.UP) {
      key.preventDefault();
      key.stopPropagation();
      setActiveIndex((prev) => (prev <= 0 ? entries.length - 1 : prev - 1));
      return;
    }

    if (key.name === KEY_NAME.DOWN) {
      key.preventDefault();
      key.stopPropagation();
      setActiveIndex((prev) => (prev + 1) % entries.length);
      return;
    }

    if (
      key.name === KEY_NAME.RETURN ||
      key.name === KEY_NAME.LINEFEED ||
      key.name === KEY_NAME.SPACE
    ) {
      key.preventDefault();
      key.stopPropagation();
      entries[activeIndex]?.toggle();
      return;
    }

    if (key.name === KEY_NAME.E) {
      key.preventDefault();
      key.stopPropagation();
      if (key.shift) {
        entries[activeIndex]?.collapse();
      } else {
        entries[activeIndex]?.expand();
      }
    }
  });

  const value = useMemo(
    () => ({
      register,
      isActive: (id: string) => entries[activeIndex]?.id === id,
      entryCount: entries.length,
    }),
    [activeIndex, entries, register]
  );

  return <TruncationContext.Provider value={value}>{children}</TruncationContext.Provider>;
}

export interface TruncationToggleConfig {
  id: string;
  label: string;
  isTruncated: boolean;
  defaultExpanded: boolean;
}

export const useTruncationToggle = ({
  id,
  label,
  isTruncated,
  defaultExpanded,
}: TruncationToggleConfig): {
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  isActive: boolean;
} => {
  const { register, isActive } = useContext(TruncationContext);
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  useEffect(() => {
    if (!isTruncated) return;

    const cleanup = register({
      id,
      label,
      expand: () => setExpanded(true),
      collapse: () => setExpanded(false),
      toggle: () => setExpanded((prev) => !prev),
    });

    return cleanup;
  }, [id, isTruncated, label, register]);

  return {
    expanded,
    setExpanded,
    isActive: isTruncated && isActive(id),
  };
};
