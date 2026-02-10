import type { KeybindConfig } from "@/config/app-config";
import {
  KEYBIND_ACTION,
  KEYBIND_ACTION_VALUES,
  type KeybindAction,
} from "@/constants/keybind-actions";
import {
  BINDING_SEPARATOR,
  CHORD_SEPARATOR,
  KEYBIND,
  LEADER_TOKEN,
  NONE,
} from "@/constants/keybinds";
import type { KeyEvent } from "@opentui/core";

export interface KeybindChord {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

export interface KeybindDefinition {
  chord: KeybindChord;
  requiresLeader: boolean;
}

export interface KeybindRuntime {
  leader: KeybindChord | null;
  bindings: Record<KeybindAction, KeybindDefinition[]>;
}

const MODIFIER_ALIASES: Record<string, string> = {
  ctrl: KEYBIND.MODIFIER.CTRL,
  control: KEYBIND.MODIFIER.CTRL,
  cmd: KEYBIND.MODIFIER.META,
  command: KEYBIND.MODIFIER.META,
  meta: KEYBIND.MODIFIER.META,
  option: KEYBIND.MODIFIER.ALT,
  alt: KEYBIND.MODIFIER.ALT,
  shift: KEYBIND.MODIFIER.SHIFT,
};

const KEY_NAME_ALIASES: Record<string, string> = {
  esc: "escape",
  escape: "escape",
  enter: "return",
  return: "return",
  linefeed: "return",
  space: "space",
  spacebar: "space",
  pgup: "pageup",
  pgdown: "pagedown",
  page_up: "pageup",
  page_down: "pagedown",
};

const createEmptyKeybindMap = (): Record<KeybindAction, KeybindDefinition[]> => ({
  [KEYBIND_ACTION.FOCUS_CHAT]: [],
  [KEYBIND_ACTION.FOCUS_FILES]: [],
  [KEYBIND_ACTION.FOCUS_PLAN]: [],
  [KEYBIND_ACTION.FOCUS_CONTEXT]: [],
  [KEYBIND_ACTION.FOCUS_SESSIONS]: [],
  [KEYBIND_ACTION.FOCUS_AGENT]: [],
  [KEYBIND_ACTION.OPEN_HELP]: [],
  [KEYBIND_ACTION.TOGGLE_SESSIONS]: [],
  [KEYBIND_ACTION.TOGGLE_BACKGROUND_TASKS]: [],
  [KEYBIND_ACTION.OPEN_THEMES]: [],
  [KEYBIND_ACTION.OPEN_SETTINGS]: [],
  [KEYBIND_ACTION.TOGGLE_TOOL_DETAILS]: [],
  [KEYBIND_ACTION.TOGGLE_THINKING]: [],
  [KEYBIND_ACTION.SESSION_CHILD_CYCLE]: [],
  [KEYBIND_ACTION.SESSION_CHILD_CYCLE_REVERSE]: [],
});

export const normalizeKeyName = (name: string): string => {
  const normalized = name.trim().toLowerCase();
  return KEY_NAME_ALIASES[normalized] ?? normalized;
};

export const parseKeyChord = (value: string): KeybindChord | null => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const parts = normalized
    .split(CHORD_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  let key: string | null = null;
  let ctrl = false;
  let meta = false;
  let alt = false;
  let shift = false;

  for (const part of parts) {
    const modifier = MODIFIER_ALIASES[part];
    if (modifier === KEYBIND.MODIFIER.CTRL) {
      ctrl = true;
      continue;
    }
    if (modifier === KEYBIND.MODIFIER.META) {
      meta = true;
      continue;
    }
    if (modifier === KEYBIND.MODIFIER.ALT) {
      alt = true;
      continue;
    }
    if (modifier === KEYBIND.MODIFIER.SHIFT) {
      shift = true;
      continue;
    }
    if (!key) {
      key = normalizeKeyName(part);
    }
  }

  if (!key) {
    return null;
  }

  return {
    key,
    ctrl,
    meta,
    alt,
    shift,
  };
};

export const matchesKeyChord = (key: KeyEvent, chord: KeybindChord): boolean => {
  const name = normalizeKeyName(key.name);
  const altPressed = Boolean(key.option) || ("alt" in key ? Boolean(key.alt) : false);
  return (
    name === chord.key &&
    Boolean(key.ctrl) === chord.ctrl &&
    Boolean(key.meta) === chord.meta &&
    altPressed === chord.alt &&
    Boolean(key.shift) === chord.shift
  );
};

const parseBindings = (raw: string): KeybindDefinition[] => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === NONE) {
    return [];
  }
  const bindings = trimmed.split(BINDING_SEPARATOR).map((part) => part.trim());
  const parsed: KeybindDefinition[] = [];
  for (const binding of bindings) {
    if (!binding) continue;
    const requiresLeader = binding.includes(LEADER_TOKEN);
    const chordValue = binding.replace(LEADER_TOKEN, "").trim();
    const chord = parseKeyChord(chordValue);
    if (!chord) continue;
    parsed.push({ chord, requiresLeader });
  }
  return parsed;
};

export const createKeybindRuntime = (config: KeybindConfig): KeybindRuntime => {
  const bindingsMap = createEmptyKeybindMap();
  for (const action of KEYBIND_ACTION_VALUES) {
    const raw = config.bindings?.[action];
    if (!raw) {
      continue;
    }
    bindingsMap[action] = parseBindings(raw);
  }
  return {
    leader: config.leader ? parseKeyChord(config.leader) : null,
    bindings: bindingsMap,
  };
};

export const isLeaderKey = (key: KeyEvent, runtime: KeybindRuntime): boolean => {
  if (!runtime.leader) {
    return false;
  }
  return matchesKeyChord(key, runtime.leader);
};

export const isActionTriggered = (
  key: KeyEvent,
  runtime: KeybindRuntime,
  action: KeybindAction,
  leaderActive: boolean
): boolean => {
  const bindings = runtime.bindings[action];
  if (!bindings || bindings.length === 0) {
    return false;
  }
  return bindings.some((binding) => {
    if (binding.requiresLeader && !leaderActive) {
      return false;
    }
    return matchesKeyChord(key, binding.chord);
  });
};
