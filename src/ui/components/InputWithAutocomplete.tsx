import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { FULL_WIDTH_STYLE } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS, type CommandDefinition } from "@/constants/command-definitions";
import { FILE_SUGGESTION_KIND } from "@/constants/file-suggestion-kind";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import { KEY_NAME } from "@/constants/key-names";
import { createIgnoreFilter } from "@/ui/components/input-helpers";
import {
  CommandSuggestions,
  type FileMentionSuggestion,
  FileSuggestions,
} from "@/ui/components/input-suggestions";
import { useVimInput } from "@/ui/hooks/useVimInput";
import type {
  InputRenderable,
  KeyBinding as TextareaKeyBinding,
  TextareaRenderable,
} from "@opentui/core";
import { type SubmitEvent, TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import fg from "fast-glob";
import fuzzysort from "fuzzysort";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SlashCommand = CommandDefinition;

export interface InputWithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  slashCommands?: SlashCommand[];
  placeholder?: string;
  /** Enable multiline editing; Enter submits, Shift+Enter inserts newline. Default: false. */
  multiline?: boolean;
  /** Enable @-mention file suggestions. Default: true. */
  enableMentions?: boolean;
  /** Focus target - only process input when focusTarget is "chat". Default: "chat". */
  focusTarget?: FocusTarget;
  shellCompletion?: ShellCompletionProvider;
  /** Optional handler to open agent selector on Tab. */
  onAgentSwitch?: () => void;
  /** Enable vim-style editing. */
  vimEnabled?: boolean;
}

export interface ShellCompletionProvider {
  isShellInput: (value: string) => boolean;
  getCompletions: (prefix: string) => Promise<string[]>;
}

const DEFAULT_COMMANDS: SlashCommand[] = COMMAND_DEFINITIONS;
const MENTION_REGEX = /@([\w./-]*)$/;
const MENTION_SUGGESTION_LIMIT = LIMIT.MENTION_SUGGESTION_LIMIT;
const PATH_SEPARATOR = "/" as const;

const TEXTAREA_KEYBINDINGS: TextareaKeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "return", shift: true, action: "newline" },
];

export function InputWithAutocomplete({
  value,
  onChange,
  onSubmit,
  slashCommands = DEFAULT_COMMANDS,
  placeholder = "Type a message or / for commands…",
  multiline = false,
  enableMentions = true,
  focusTarget = FOCUS_TARGET.CHAT,
  shellCompletion,
  onAgentSwitch,
  vimEnabled = false,
}: InputWithAutocompleteProps): ReactNode {
  const inputRef = useRef<InputRenderable | null>(null);
  const textareaRef = useRef<TextareaRenderable | null>(null);

  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionCandidatePaths, setMentionCandidatePaths] = useState<string[]>([]);
  const [mentionCandidateIsDir, setMentionCandidateIsDir] = useState<Map<string, boolean>>(
    () => new Map()
  );
  const [mentionSuggestions, setMentionSuggestions] = useState<FileMentionSuggestion[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [shellSuggestions, setShellSuggestions] = useState<string[]>([]);
  const [shellIndex, setShellIndex] = useState(0);
  const [shellAnchor, setShellAnchor] = useState<{
    prefix: string;
    start: number;
    end: number;
  } | null>(null);

  const activeInput = multiline ? textareaRef.current : inputRef.current;

  const updateCursor = useCallback(() => {
    const offset = activeInput?.cursorOffset;
    if (typeof offset === "number") {
      setCursorPosition(offset);
    }
  }, [activeInput]);

  const setCursorOffset = useCallback(
    (offset: number) => {
      setCursorPosition(offset);
      queueMicrotask(() => {
        if (multiline) {
          if (textareaRef.current) {
            textareaRef.current.cursorOffset = offset;
          }
        } else if (inputRef.current) {
          inputRef.current.cursorOffset = offset;
        }
      });
    },
    [multiline]
  );

  const { handleVimKey } = useVimInput({
    enabled: vimEnabled,
    value,
    cursorPosition,
    setCursorOffset,
    onChange,
  });

  useEffect(() => {
    if (!enableMentions) return;
    let cancelled = false;
    const loadFiles = async () => {
      try {
        setIsLoadingFiles(true);
        const cwd = process.cwd();
        const shouldIgnore = await createIgnoreFilter(cwd);
        const [files, dirs] = await Promise.all([
          fg("**/*", {
            cwd,
            onlyFiles: true,
            dot: false,
          }),
          fg("**/*", {
            cwd,
            onlyDirectories: true,
            dot: false,
          }),
        ]);

        const filteredDirs = dirs.filter((dir) => !shouldIgnore(dir));
        const filteredFiles = files.filter((file) => !shouldIgnore(file));

        const isDirByPath = new Map<string, boolean>();
        for (const dir of filteredDirs) {
          isDirByPath.set(dir, true);
        }
        for (const file of filteredFiles) {
          isDirByPath.set(file, false);
        }

        const combined = [...filteredDirs, ...filteredFiles].slice(0, LIMIT.MAX_FILES);
        if (cancelled) return;
        setMentionCandidatePaths(combined);
        setMentionCandidateIsDir(isDirByPath);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setFileError(message);
      } finally {
        if (!cancelled) {
          setIsLoadingFiles(false);
        }
      }
    };

    void loadFiles();
    return () => {
      cancelled = true;
    };
  }, [enableMentions]);

  useEffect(() => {
    if (cursorPosition > value.length) {
      setCursorPosition(value.length);
    }
  }, [cursorPosition, value.length]);

  useEffect(() => {
    if (!multiline) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (textarea.plainText !== value) {
      const nextValue = value;
      queueMicrotask(() => {
        const current = textareaRef.current;
        if (!current || current.plainText === nextValue) return;
        current.replaceText(nextValue);
        current.cursorOffset = nextValue.length;
        setCursorPosition(nextValue.length);
      });
    }
  }, [multiline, value]);

  const commandSuggestions = useMemo(() => {
    if (!value.startsWith("/")) return [];
    const query = value.toLowerCase();
    return slashCommands.filter((cmd) => cmd.name.toLowerCase().startsWith(query));
  }, [value, slashCommands]);

  const mentionQuery = useMemo(() => {
    if (!enableMentions) return null;
    const beforeCursor = value.slice(0, cursorPosition);
    const match = beforeCursor.match(MENTION_REGEX);
    return match ? match[1] : null;
  }, [cursorPosition, enableMentions, value]);

  const buildMentionSuggestion = useCallback(
    (path: string): FileMentionSuggestion => {
      const isDir = mentionCandidateIsDir.get(path) ?? false;
      if (isDir) {
        const text = path.endsWith(PATH_SEPARATOR) ? path : `${path}${PATH_SEPARATOR}`;
        return {
          kind: FILE_SUGGESTION_KIND.FOLDER,
          displayText: text,
          insertText: text,
        };
      }
      return {
        kind: FILE_SUGGESTION_KIND.FILE,
        displayText: path,
        insertText: path,
      };
    },
    [mentionCandidateIsDir]
  );

  useEffect(() => {
    if (!enableMentions || !mentionQuery) {
      setMentionSuggestions([]);
      return;
    }
    if (mentionCandidatePaths.length === 0) {
      setMentionSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      const results = fuzzysort.go(mentionQuery, mentionCandidatePaths, {
        limit: MENTION_SUGGESTION_LIMIT,
      });
      setMentionSuggestions(results.map((r) => buildMentionSuggestion(r.target)));
    }, TIMEOUT.MENTION_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [buildMentionSuggestion, enableMentions, mentionCandidatePaths, mentionQuery]);

  useEffect(() => {
    setShowAutocomplete(value.startsWith("/") && commandSuggestions.length > 0);
    setSelectedIndex(0);
    if (!shellCompletion || !shellCompletion.isShellInput(value)) {
      setShellSuggestions([]);
      setShellIndex(0);
      setShellAnchor(null);
    }
  }, [value, commandSuggestions, shellCompletion]);

  const hasMentionSuggestions = mentionSuggestions.length > 0;

  const getShellTokenContext = useCallback(() => {
    const beforeCursor = value.slice(0, cursorPosition);
    const match = beforeCursor.match(/(\S+)$/);
    if (!match) return null;
    const token = match[1];
    if (!token) return null;
    const start = beforeCursor.length - token.length;
    const end = cursorPosition;
    if (token.startsWith("!")) {
      const prefix = token.slice(1);
      return { prefix, start: start + 1, end };
    }
    return { prefix: token, start, end };
  }, [cursorPosition, value]);

  const applyShellCompletion = useCallback(
    (suggestion: string, context: { start: number; end: number }) => {
      const before = value.slice(0, context.start);
      const after = value.slice(context.end);
      const nextValue = `${before}${suggestion}${after}`;
      onChange(nextValue);
      setCursorOffset(context.start + suggestion.length);
    },
    [onChange, setCursorOffset, value]
  );

  const handleShellTab = useCallback(async () => {
    if (!shellCompletion || !shellCompletion.isShellInput(value)) return;
    const context = getShellTokenContext();
    if (!context || context.prefix.length === 0) return;

    const shouldReuse =
      shellAnchor &&
      shellAnchor.prefix === context.prefix &&
      shellAnchor.start === context.start &&
      shellAnchor.end === context.end &&
      shellSuggestions.length > 0;

    if (shouldReuse) {
      const nextIndex = (shellIndex + 1) % shellSuggestions.length;
      const suggestion = shellSuggestions[nextIndex];
      if (suggestion) {
        applyShellCompletion(suggestion, context);
        setShellIndex(nextIndex);
      }
      return;
    }

    const suggestions = await shellCompletion.getCompletions(context.prefix);
    const [first] = suggestions;
    if (!first) return;
    setShellSuggestions(suggestions);
    setShellIndex(0);
    setShellAnchor(context);
    applyShellCompletion(first, context);
  }, [
    applyShellCompletion,
    getShellTokenContext,
    shellAnchor,
    shellCompletion,
    shellIndex,
    shellSuggestions,
    value,
  ]);

  const applyCommandSuggestion = useCallback(
    (name: string, args?: string) => {
      const newValue = name + (args ? " " : "");
      onChange(newValue);
      setCursorOffset(newValue.length);
      setShowAutocomplete(false);
    },
    [onChange, setCursorOffset]
  );

  const applyMentionSuggestion = useCallback(
    (selected: FileMentionSuggestion) => {
      const before = value.slice(0, cursorPosition);
      const after = value.slice(cursorPosition);

      const trailing = selected.kind === FILE_SUGGESTION_KIND.FILE ? " " : "";
      const insertion = `@${selected.insertText}${trailing}`;
      const replacedBefore = before.replace(MENTION_REGEX, insertion);
      const replaced = replacedBefore + after;
      const newCursor = replacedBefore.length;

      onChange(replaced);
      setCursorOffset(newCursor);
      setSelectedIndex(0);
    },
    [cursorPosition, onChange, setCursorOffset, value]
  );

  useKeyboard((key) => {
    if (focusTarget !== FOCUS_TARGET.CHAT) return;

    if (handleVimKey(key)) {
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (showAutocomplete && commandSuggestions.length > 0) {
      if (key.name === KEY_NAME.UP) {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : commandSuggestions.length - 1));
        return;
      }
      if (key.name === KEY_NAME.DOWN) {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev < commandSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (
        (key.name === KEY_NAME.TAB && !key.shift) ||
        key.name === KEY_NAME.RETURN ||
        key.name === KEY_NAME.LINEFEED
      ) {
        key.preventDefault();
        key.stopPropagation();
        const selected = commandSuggestions[selectedIndex];
        if (selected) {
          applyCommandSuggestion(selected.name, selected.args);
        }
        return;
      }
      if (key.name === KEY_NAME.ESCAPE) {
        key.preventDefault();
        key.stopPropagation();
        setShowAutocomplete(false);
        return;
      }
    }

    if (hasMentionSuggestions) {
      if (key.name === KEY_NAME.UP) {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : mentionSuggestions.length - 1));
        return;
      }
      if (key.name === KEY_NAME.DOWN) {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev < mentionSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (
        (key.name === KEY_NAME.TAB && !key.shift) ||
        key.name === KEY_NAME.RETURN ||
        key.name === KEY_NAME.LINEFEED
      ) {
        key.preventDefault();
        key.stopPropagation();
        const selected = mentionSuggestions[selectedIndex];
        if (selected) {
          applyMentionSuggestion(selected);
        }
        return;
      }
      if (key.name === KEY_NAME.ESCAPE) {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex(0);
        return;
      }
    }

    if (key.name === KEY_NAME.TAB && !key.shift && shellCompletion?.isShellInput(value)) {
      key.preventDefault();
      key.stopPropagation();
      void handleShellTab();
      return;
    }

    if (key.name === KEY_NAME.TAB && !key.shift && onAgentSwitch && value.trim().length === 0) {
      key.preventDefault();
      key.stopPropagation();
      onAgentSwitch();
    }
  });

  const handleInput = useCallback(
    (nextValue: string) => {
      onChange(nextValue);
    },
    [onChange]
  );

  const handleTextareaChange = useCallback(() => {
    const nextValue = textareaRef.current?.plainText ?? value;
    onChange(nextValue);
  }, [onChange, value]);

  const handleSubmit = useCallback(
    (submitted: string | SubmitEvent) => {
      if (typeof submitted !== "string") return;
      onSubmit(submitted);
      onChange("");
      setCursorOffset(0);
    },
    [onChange, onSubmit, setCursorOffset]
  );

  const handleTextareaSubmit = useCallback(
    (_event: SubmitEvent) => {
      const submitted = textareaRef.current?.plainText ?? value;
      onSubmit(submitted);
      onChange("");
      setCursorOffset(0);
    },
    [onChange, onSubmit, setCursorOffset, value]
  );

  const shellModeActive = shellCompletion?.isShellInput(value) ?? false;

  return (
    <box flexDirection="column" flexShrink={0} minWidth={0}>
      {shellModeActive ? (
        <text fg={COLOR.YELLOW} attributes={TextAttributes.DIM}>
          Shell mode active (Tab to complete, add & for background)
        </text>
      ) : null}
      {showAutocomplete && commandSuggestions.length > 0 && (
        <CommandSuggestions commands={commandSuggestions} selectedIndex={selectedIndex} />
      )}

      {enableMentions && hasMentionSuggestions && (
        <FileSuggestions
          suggestions={mentionSuggestions}
          selectedIndex={selectedIndex}
          isLoading={isLoadingFiles}
          error={fileError}
        />
      )}

      <box
        border={true}
        borderStyle="single"
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={0}
        minHeight={multiline ? LIMIT.INPUT_MULTILINE_MIN_HEIGHT : 1}
        height={multiline ? LIMIT.INPUT_MULTILINE_HEIGHT : 1}
        minWidth={0}
        flexDirection={multiline ? "column" : "row"}
      >
        {!multiline && <text fg={COLOR.GRAY}>› </text>}
        {multiline ? (
          <textarea
            ref={textareaRef}
            initialValue={value}
            focused={focusTarget === FOCUS_TARGET.CHAT}
            onContentChange={handleTextareaChange}
            onCursorChange={updateCursor}
            onSubmit={handleTextareaSubmit}
            keyBindings={TEXTAREA_KEYBINDINGS}
            style={FULL_WIDTH_STYLE}
          />
        ) : (
          <input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            focused={focusTarget === FOCUS_TARGET.CHAT}
            onInput={handleInput}
            onChange={handleInput}
            onSubmit={handleSubmit}
            onCursorChange={updateCursor}
            style={FULL_WIDTH_STYLE}
          />
        )}
      </box>
    </box>
  );
}
