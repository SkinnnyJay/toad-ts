import { VIM_MODE } from "@/constants/vim-modes";
import type { VimMode } from "@/constants/vim-modes";
import { VIM_OPERATOR, type VimOperator } from "@/constants/vim-operators";
import type { KeyEvent } from "@opentui/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface VimRange {
  start: number;
  end: number;
}

export interface UseVimInputOptions {
  enabled: boolean;
  value: string;
  cursorPosition: number;
  setCursorOffset: (offset: number) => void;
  onChange: (value: string) => void;
}

export interface UseVimInputResult {
  handleVimKey: (key: KeyEvent) => boolean;
}

export const useVimInput = ({
  enabled,
  value,
  cursorPosition,
  setCursorOffset,
  onChange,
}: UseVimInputOptions): UseVimInputResult => {
  const [vimMode, setVimMode] = useState<VimMode>(enabled ? VIM_MODE.NORMAL : VIM_MODE.INSERT);
  const [vimOperator, setVimOperator] = useState<VimOperator | null>(null);
  const [vimPendingTextObject, setVimPendingTextObject] = useState(false);
  const registerRef = useRef<string>("");

  const enterNormalMode = useCallback(() => {
    setVimMode(VIM_MODE.NORMAL);
    setVimOperator(null);
    setVimPendingTextObject(false);
    if (value.length === 0) {
      setCursorOffset(0);
      return;
    }
    const nextOffset = Math.min(cursorPosition, value.length - 1);
    setCursorOffset(nextOffset);
  }, [cursorPosition, setCursorOffset, value.length]);

  const enterInsertMode = useCallback(() => {
    setVimMode(VIM_MODE.INSERT);
    setVimOperator(null);
    setVimPendingTextObject(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setVimMode(VIM_MODE.INSERT);
      setVimOperator(null);
      setVimPendingTextObject(false);
      return;
    }
    enterNormalMode();
  }, [enabled, enterNormalMode]);

  const clampOffset = useCallback(
    (offset: number) => Math.max(0, Math.min(offset, value.length)),
    [value.length]
  );

  const isWordChar = useCallback((char: string | undefined) => {
    if (!char) return false;
    return /[A-Za-z0-9_]/.test(char);
  }, []);

  const getLineStart = useCallback(
    (offset: number) => {
      const idx = value.lastIndexOf("\n", Math.max(0, offset - 1));
      return idx === -1 ? 0 : idx + 1;
    },
    [value]
  );

  const getLineEnd = useCallback(
    (offset: number) => {
      const idx = value.indexOf("\n", offset);
      return idx === -1 ? value.length : idx;
    },
    [value]
  );

  const moveVertical = useCallback(
    (offset: number, direction: "up" | "down") => {
      const lineStart = getLineStart(offset);
      const lineEnd = getLineEnd(offset);
      const column = offset - lineStart;
      if (direction === "up") {
        if (lineStart === 0) return offset;
        const prevLineEnd = lineStart - 1;
        const prevLineStart = value.lastIndexOf("\n", Math.max(0, prevLineEnd - 1)) + 1;
        const prevLineLength = prevLineEnd - prevLineStart;
        return prevLineStart + Math.min(column, prevLineLength);
      }
      if (lineEnd >= value.length) return offset;
      const nextLineStart = lineEnd + 1;
      const nextLineEnd = value.indexOf("\n", nextLineStart);
      const resolvedNextLineEnd = nextLineEnd === -1 ? value.length : nextLineEnd;
      const nextLineLength = resolvedNextLineEnd - nextLineStart;
      return nextLineStart + Math.min(column, nextLineLength);
    },
    [getLineEnd, getLineStart, value]
  );

  const moveToNextWordStart = useCallback(
    (offset: number) => {
      let idx = clampOffset(offset);
      if (idx < value.length && isWordChar(value[idx])) {
        while (idx < value.length && isWordChar(value[idx])) {
          idx += 1;
        }
      }
      while (idx < value.length && !isWordChar(value[idx])) {
        idx += 1;
      }
      return clampOffset(idx);
    },
    [clampOffset, isWordChar, value]
  );

  const moveToPrevWordStart = useCallback(
    (offset: number) => {
      let idx = clampOffset(offset);
      if (idx > 0 && !isWordChar(value[idx - 1])) {
        while (idx > 0 && !isWordChar(value[idx - 1])) {
          idx -= 1;
        }
      }
      while (idx > 0 && isWordChar(value[idx - 1])) {
        idx -= 1;
      }
      return clampOffset(idx);
    },
    [clampOffset, isWordChar, value]
  );

  const moveToWordEnd = useCallback(
    (offset: number) => {
      let idx = clampOffset(offset);
      if (idx < value.length && !isWordChar(value[idx])) {
        idx = moveToNextWordStart(idx);
      }
      while (idx < value.length && isWordChar(value[idx])) {
        idx += 1;
      }
      return clampOffset(Math.max(0, idx - 1));
    },
    [clampOffset, isWordChar, moveToNextWordStart, value]
  );

  const findWordBounds = useCallback(
    (offset: number): VimRange | null => {
      if (value.length === 0) return null;
      let idx = clampOffset(offset);
      if (!isWordChar(value[idx])) {
        idx = moveToNextWordStart(idx);
      }
      if (!isWordChar(value[idx])) return null;
      let start = idx;
      while (start > 0 && isWordChar(value[start - 1])) {
        start -= 1;
      }
      let end = idx;
      while (end < value.length && isWordChar(value[end])) {
        end += 1;
      }
      return { start, end };
    },
    [clampOffset, isWordChar, moveToNextWordStart, value]
  );

  const findEnclosing = useCallback(
    (openChar: string, closeChar: string, offset: number): VimRange | null => {
      const left = value.lastIndexOf(openChar, Math.max(0, offset - 1));
      const right = value.indexOf(closeChar, offset);
      if (left === -1 || right === -1 || right <= left) {
        return null;
      }
      return { start: left + 1, end: right };
    },
    [value]
  );

  const applyOperatorRange = useCallback(
    (range: VimRange, operator: VimOperator) => {
      const start = Math.min(range.start, range.end);
      const end = Math.max(range.start, range.end);
      if (start === end) {
        setVimOperator(null);
        setVimPendingTextObject(false);
        return;
      }
      const fragment = value.slice(start, end);
      if (operator === VIM_OPERATOR.YANK) {
        registerRef.current = fragment;
        setVimOperator(null);
        setVimPendingTextObject(false);
        return;
      }
      const nextValue = value.slice(0, start) + value.slice(end);
      onChange(nextValue);
      setCursorOffset(start);
      registerRef.current = fragment;
      setVimOperator(null);
      setVimPendingTextObject(false);
      if (operator === VIM_OPERATOR.CHANGE) {
        setVimMode(VIM_MODE.INSERT);
      }
    },
    [onChange, setCursorOffset, value]
  );

  const resolveMotionRange = useCallback(
    (keyName: string, offset: number): VimRange | null => {
      if (keyName === "h") {
        const start = Math.max(0, offset - 1);
        return { start, end: offset };
      }
      if (keyName === "l") {
        const end = Math.min(value.length, offset + 1);
        return { start: offset, end };
      }
      if (keyName === "w") {
        const end = moveToNextWordStart(offset);
        return { start: offset, end };
      }
      if (keyName === "e") {
        const end = Math.min(value.length, moveToWordEnd(offset) + 1);
        return { start: offset, end };
      }
      if (keyName === "b") {
        const start = moveToPrevWordStart(offset);
        return { start, end: offset };
      }
      return null;
    },
    [moveToNextWordStart, moveToPrevWordStart, moveToWordEnd, value.length]
  );

  const resolveTextObjectRange = useCallback(
    (keyName: string, offset: number): VimRange | null => {
      if (keyName === "w") {
        return findWordBounds(offset);
      }
      if (keyName === '"') {
        return findEnclosing('"', '"', offset);
      }
      if (keyName === "'") {
        return findEnclosing("'", "'", offset);
      }
      if (keyName === "{") {
        return findEnclosing("{", "}", offset);
      }
      if (keyName === "(") {
        return findEnclosing("(", ")", offset);
      }
      if (keyName === "[") {
        return findEnclosing("[", "]", offset);
      }
      return null;
    },
    [findEnclosing, findWordBounds]
  );

  const handleVimKey = useCallback(
    (key: KeyEvent): boolean => {
      if (!enabled) {
        return false;
      }
      const keyName = key.name.toLowerCase();

      if (vimMode === VIM_MODE.INSERT) {
        if (keyName === "escape") {
          enterNormalMode();
          return true;
        }
        return false;
      }

      if (keyName === "tab" && key.shift) {
        return false;
      }
      if (key.ctrl || key.meta || key.option) {
        return false;
      }

      if (keyName === "escape") {
        setVimOperator(null);
        setVimPendingTextObject(false);
        return true;
      }

      if (vimOperator) {
        if (vimPendingTextObject) {
          const range = resolveTextObjectRange(keyName, cursorPosition);
          if (range) {
            applyOperatorRange(range, vimOperator);
          } else {
            setVimOperator(null);
          }
          setVimPendingTextObject(false);
          return true;
        }

        if (keyName === "i") {
          setVimPendingTextObject(true);
          return true;
        }

        const motionRange = resolveMotionRange(keyName, cursorPosition);
        if (motionRange) {
          applyOperatorRange(motionRange, vimOperator);
        } else {
          setVimOperator(null);
        }
        return true;
      }

      if (keyName === "i") {
        enterInsertMode();
        return true;
      }

      if (keyName === "a") {
        setCursorOffset(Math.min(value.length, cursorPosition + 1));
        enterInsertMode();
        return true;
      }

      if (keyName === "h" || keyName === "left") {
        setCursorOffset(Math.max(0, cursorPosition - 1));
        return true;
      }

      if (keyName === "l" || keyName === "right") {
        if (value.length === 0) {
          return true;
        }
        setCursorOffset(Math.min(value.length - 1, cursorPosition + 1));
        return true;
      }

      if (keyName === "j" || keyName === "down") {
        setCursorOffset(moveVertical(cursorPosition, "down"));
        return true;
      }

      if (keyName === "k" || keyName === "up") {
        setCursorOffset(moveVertical(cursorPosition, "up"));
        return true;
      }

      if (keyName === "w") {
        setCursorOffset(moveToNextWordStart(cursorPosition));
        return true;
      }

      if (keyName === "e") {
        setCursorOffset(moveToWordEnd(cursorPosition));
        return true;
      }

      if (keyName === "b") {
        setCursorOffset(moveToPrevWordStart(cursorPosition));
        return true;
      }

      const isVimOperatorKey = (value: string): value is VimOperator =>
        value === VIM_OPERATOR.DELETE ||
        value === VIM_OPERATOR.CHANGE ||
        value === VIM_OPERATOR.YANK;
      if (isVimOperatorKey(keyName)) {
        setVimOperator(keyName);
        setVimPendingTextObject(false);
        return true;
      }

      return true;
    },
    [
      applyOperatorRange,
      cursorPosition,
      enabled,
      enterInsertMode,
      enterNormalMode,
      moveToNextWordStart,
      moveToPrevWordStart,
      moveToWordEnd,
      moveVertical,
      resolveMotionRange,
      resolveTextObjectRange,
      setCursorOffset,
      value.length,
      vimMode,
      vimOperator,
      vimPendingTextObject,
    ]
  );

  return { handleVimKey };
};
