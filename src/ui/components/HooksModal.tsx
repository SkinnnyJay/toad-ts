import type { HookDefinition, HookGroup, HooksConfig } from "@/config/app-config";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { HOOK_EVENT_VALUES } from "@/constants/hook-events";
import { HOOK_TYPE } from "@/constants/hook-types";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { ReactNode } from "react";

interface HooksModalProps {
  isOpen: boolean;
  hooks: HooksConfig;
  onClose: () => void;
}

const renderHookLabel = (hook: HookDefinition): string => {
  if (hook.type === HOOK_TYPE.COMMAND) {
    return `${hook.type}: ${hook.command ?? ""}`;
  }
  if (hook.type === HOOK_TYPE.PROMPT) {
    return `${hook.type}: ${hook.prompt ?? ""}`;
  }
  return hook.type;
};

const buildHookKey = (hook: HookDefinition): string => {
  if (hook.type === HOOK_TYPE.COMMAND) {
    return `${hook.type}:${hook.command ?? ""}`;
  }
  if (hook.type === HOOK_TYPE.PROMPT) {
    return `${hook.type}:${hook.prompt ?? ""}`;
  }
  return hook.type;
};

const buildGroupKey = (event: string, group: HookGroup): string => {
  const matcher = group.matcher ?? "all";
  const hookKeys = group.hooks.map(buildHookKey).join("|");
  return `${event}:${matcher}:${hookKeys}`;
};

export function HooksModal({ isOpen, hooks, onClose }: HooksModalProps): ReactNode {
  useKeyboard((key) => {
    if (!isOpen) return;
    if (key.name === KEY_NAME.ESCAPE || (key.ctrl && key.name === KEYBOARD_INPUT.SKIP_LOWER)) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
    }
  });

  if (!isOpen) return null;

  const contentMinHeight = UI.MODAL_HEIGHT - UI.SIDEBAR_PADDING * 2 - UI.SCROLLBAR_WIDTH;

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      minHeight={UI.MODAL_HEIGHT}
      width={UI.MODAL_WIDTH}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          Hooks (Esc/Ctrl+S to close)
        </text>
      </box>

      <box flexDirection="column" flexGrow={1} minHeight={contentMinHeight}>
        {HOOK_EVENT_VALUES.map((event) => {
          const groups = hooks[event] ?? [];
          return (
            <box key={event} flexDirection="column" marginBottom={1}>
              <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
                {event}
              </text>
              {groups.length === 0 ? (
                <text attributes={TextAttributes.DIM}> (no hooks configured)</text>
              ) : (
                groups.map((group, index) => (
                  <box
                    key={buildGroupKey(event, group)}
                    flexDirection="column"
                    marginLeft={UI.SIDEBAR_PADDING}
                  >
                    <text>
                      {index + 1}. {group.matcher ? `matcher: ${group.matcher}` : "matcher: all"}
                    </text>
                    {group.hooks.map((hook) => (
                      <text key={buildHookKey(hook)} marginLeft={UI.SIDEBAR_PADDING}>
                        - {renderHookLabel(hook)}
                      </text>
                    ))}
                  </box>
                ))
              )}
            </box>
          );
        })}
      </box>

      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>Esc/Ctrl+S: Close</text>
      </box>
    </box>
  );
}
