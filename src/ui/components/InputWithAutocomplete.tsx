import { readFile } from "node:fs/promises";
import path from "node:path";
import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { COMMAND_DEFINITIONS, type CommandDefinition } from "@/constants/command-definitions";
import { FOCUS_TARGET, type FocusTarget } from "@/constants/focus-target";
import type {
  InputRenderable,
  KeyBinding as TextareaKeyBinding,
  TextareaRenderable,
} from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import fg from "fast-glob";
import fuzzysort from "fuzzysort";
import ignore from "ignore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SlashCommand = CommandDefinition;

export interface InputWithAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  slashCommands?: SlashCommand[];
  placeholder?: string;
  /** Enable multiline editing; Enter inserts newline, Ctrl+Enter submits. Default: false. */
  multiline?: boolean;
  /** Enable @-mention file suggestions. Default: true. */
  enableMentions?: boolean;
  /** Focus target - only process input when focusTarget is "chat". Default: "chat". */
  focusTarget?: FocusTarget;
}

const DEFAULT_COMMANDS: SlashCommand[] = COMMAND_DEFINITIONS;
const MENTION_REGEX = /@([\w./-]*)$/;
const MENTION_SUGGESTION_LIMIT = 8;
const MENTION_DEBOUNCE_MS = 150;

const toPosix = (value: string): string => value.split(path.sep).join("/");

const createIgnoreFilter = async (cwd: string): Promise<(relativePath: string) => boolean> => {
  const ig = ignore();
  ig.add([".git", "node_modules", "dist", ".next"]);
  try {
    const gitignore = await readFile(path.join(cwd, ".gitignore"), "utf8");
    ig.add(gitignore);
  } catch (_error) {
    // ignore missing .gitignore
  }
  return (relativePath: string): boolean => ig.ignores(toPosix(relativePath));
};

const TEXTAREA_KEYBINDINGS: TextareaKeyBinding[] = [
  { name: "return", shift: true, action: "newline" },
  { name: "return", ctrl: true, action: "submit" },
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
}: InputWithAutocompleteProps): JSX.Element {
  const inputRef = useRef<InputRenderable | null>(null);
  const textareaRef = useRef<TextareaRenderable | null>(null);

  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

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

  // Load project file list for @ mentions (basic ignore for node_modules/.git)
  useEffect(() => {
    if (!enableMentions) return;
    let cancelled = false;
    const loadFiles = async () => {
      try {
        setIsLoadingFiles(true);
        const cwd = process.cwd();
        const shouldIgnore = await createIgnoreFilter(cwd);
        const files = await fg("**/*", {
          cwd,
          onlyFiles: true,
          dot: false,
        });
        if (cancelled) return;
        const filtered = files.filter((file) => !shouldIgnore(file)).slice(0, LIMIT.MAX_FILES);
        setFilePaths(filtered);
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
      textarea.replaceText(value);
      textarea.cursorOffset = value.length;
      setCursorPosition(value.length);
    }
  }, [multiline, value]);

  // Calculate autocomplete suggestions for slash commands
  const commandSuggestions = useMemo(() => {
    if (!value.startsWith("/")) return [];
    const query = value.toLowerCase();
    return slashCommands.filter((cmd) => cmd.name.toLowerCase().startsWith(query));
  }, [value, slashCommands]);

  // Detect active @ mention token before cursor
  const mentionQuery = useMemo(() => {
    if (!enableMentions) return null;
    const beforeCursor = value.slice(0, cursorPosition);
    const match = beforeCursor.match(MENTION_REGEX);
    return match ? match[1] : null;
  }, [cursorPosition, enableMentions, value]);

  useEffect(() => {
    if (!enableMentions || !mentionQuery) {
      setMentionSuggestions([]);
      return;
    }
    if (filePaths.length === 0) {
      setMentionSuggestions([]);
      return;
    }
    const handle = setTimeout(() => {
      const results = fuzzysort.go(mentionQuery, filePaths, {
        limit: MENTION_SUGGESTION_LIMIT,
      });
      setMentionSuggestions(results.map((r) => r.target));
    }, MENTION_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [enableMentions, filePaths, mentionQuery]);

  // Show/hide autocomplete based on input
  useEffect(() => {
    setShowAutocomplete(value.startsWith("/") && commandSuggestions.length > 0);
    setSelectedIndex(0);
  }, [value, commandSuggestions]);

  const hasMentionSuggestions = mentionSuggestions.length > 0;

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
    (selected: string) => {
      const before = value.slice(0, cursorPosition);
      const after = value.slice(cursorPosition);
      const replaced = before.replace(MENTION_REGEX, `@${selected} `) + after;
      const newCursor = before.replace(MENTION_REGEX, `@${selected} `).length;
      onChange(replaced);
      setCursorOffset(newCursor);
      setSelectedIndex(0);
    },
    [cursorPosition, onChange, setCursorOffset, value]
  );

  useKeyboard((key) => {
    if (focusTarget !== FOCUS_TARGET.CHAT) return;

    if (showAutocomplete && commandSuggestions.length > 0) {
      if (key.name === "up") {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : commandSuggestions.length - 1));
        return;
      }
      if (key.name === "down") {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev < commandSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.name === "tab" || key.name === "return" || key.name === "linefeed") {
        key.preventDefault();
        key.stopPropagation();
        const selected = commandSuggestions[selectedIndex];
        if (selected) {
          applyCommandSuggestion(selected.name, selected.args);
        }
        return;
      }
      if (key.name === "escape") {
        key.preventDefault();
        key.stopPropagation();
        setShowAutocomplete(false);
        return;
      }
    }

    if (hasMentionSuggestions) {
      if (key.name === "up") {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : mentionSuggestions.length - 1));
        return;
      }
      if (key.name === "down") {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex((prev) => (prev < mentionSuggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.name === "tab" || key.name === "return" || key.name === "linefeed") {
        key.preventDefault();
        key.stopPropagation();
        const selected = mentionSuggestions[selectedIndex];
        if (selected) {
          applyMentionSuggestion(selected);
        }
        return;
      }
      if (key.name === "escape") {
        key.preventDefault();
        key.stopPropagation();
        setSelectedIndex(0);
        return;
      }
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
    (submitted: string) => {
      onSubmit(submitted);
      onChange("");
      setCursorOffset(0);
    },
    [onChange, onSubmit, setCursorOffset]
  );

  const handleTextareaSubmit = useCallback(() => {
    const submitted = textareaRef.current?.plainText ?? value;
    onSubmit(submitted);
    onChange("");
    setCursorOffset(0);
  }, [onChange, onSubmit, setCursorOffset, value]);

  return (
    <box flexDirection="column" flexGrow={1} minWidth={0}>
      {showAutocomplete && commandSuggestions.length > 0 && (
        <box
          flexDirection="column"
          border={true}
          borderStyle="single"
          borderColor={COLOR.CYAN}
          marginBottom={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
            Commands:
          </text>
          {commandSuggestions.map((cmd, index) => (
            <box key={cmd.name} paddingLeft={1}>
              <text
                fg={index === selectedIndex ? COLOR.YELLOW : COLOR.WHITE}
                attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
              >
                {index === selectedIndex ? "▶ " : "  "}
                {cmd.name}
              </text>
              {cmd.args ? <text fg={COLOR.GRAY}> {cmd.args}</text> : null}
              <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>{` - ${cmd.description}`}</text>
            </box>
          ))}
          <box marginTop={1}>
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              ↑↓ Navigate · Tab/Enter Select · Esc Cancel
            </text>
          </box>
        </box>
      )}

      {enableMentions && hasMentionSuggestions && (
        <box
          flexDirection="column"
          border={true}
          borderStyle="single"
          borderColor={COLOR.GREEN}
          marginBottom={1}
          paddingLeft={1}
          paddingRight={1}
        >
          <text fg={COLOR.GREEN} attributes={TextAttributes.BOLD}>
            Files:
          </text>
          {mentionSuggestions.map((file, index) => (
            <box key={file} paddingLeft={1}>
              <text
                fg={index === selectedIndex ? COLOR.YELLOW : COLOR.WHITE}
                attributes={index === selectedIndex ? TextAttributes.BOLD : 0}
              >
                {index === selectedIndex ? "▶ " : "  "}@{file}
              </text>
            </box>
          ))}
          {isLoadingFiles ? (
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              Loading files…
            </text>
          ) : fileError ? (
            <text fg={COLOR.RED}>{fileError}</text>
          ) : null}
          <box marginTop={1}>
            <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
              ↑↓ Navigate · Tab/Enter Insert · Esc Cancel
            </text>
          </box>
        </box>
      )}

      <box
        border={true}
        borderStyle="single"
        paddingLeft={1}
        paddingRight={1}
        paddingY={multiline ? 1 : 0}
        minHeight={multiline ? 5 : 1}
        height={multiline ? undefined : 1}
        flexGrow={multiline ? 1 : undefined}
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
            style={{ width: "100%" }}
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
            style={{ width: "100%" }}
          />
        )}
      </box>
    </box>
  );
}
