import { CURSOR_HOOK_EVENT } from "@/constants/cursor-hook-events";
import { TOOL_KIND, type ToolKind } from "@/constants/tool-kinds";
import { inferToolKindFromName } from "@/core/cli-agent/tool-kind-mapper";
import type { CursorHookInput } from "@/types/cursor-hooks.types";

export interface CursorPermissionRequestMetadata {
  toolCallKey: string;
  title: string;
  input: Record<string, unknown>;
  kind: ToolKind;
}

export const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeCursorFileEdits = (
  edits: unknown,
  fallbackPath: string | null
): Array<{ path?: string; old_string?: string; new_string?: string }> => {
  if (!Array.isArray(edits)) {
    return [];
  }
  return edits.map((edit) => {
    if (!edit || typeof edit !== "object") {
      return {
        path: fallbackPath ?? undefined,
      };
    }
    const typedEdit = edit as {
      path?: unknown;
      old_string?: unknown;
      new_string?: unknown;
    };
    return {
      path: asNonEmptyString(typedEdit.path) ?? fallbackPath ?? undefined,
      old_string: asNonEmptyString(typedEdit.old_string) ?? undefined,
      new_string: asNonEmptyString(typedEdit.new_string) ?? undefined,
    };
  });
};

export const inferCursorToolKind = (toolName: string): ToolKind => {
  return inferToolKindFromName(toolName);
};

export const mapCursorPermissionRequestMetadata = (
  event: CursorHookInput
): CursorPermissionRequestMetadata => {
  switch (event.hook_event_name) {
    case CURSOR_HOOK_EVENT.BEFORE_SHELL_EXECUTION: {
      const command = asNonEmptyString(event.command) ?? "unknown";
      return {
        toolCallKey: `shell:${command}`,
        title: `Shell: ${command}`,
        input: { command },
        kind: TOOL_KIND.EXECUTE,
      };
    }
    case CURSOR_HOOK_EVENT.BEFORE_MCP_EXECUTION: {
      const serverName = asNonEmptyString(event.server_name) ?? "mcp";
      const toolName = asNonEmptyString(event.tool_name) ?? "tool";
      return {
        toolCallKey: `mcp:${serverName}:${toolName}`,
        title: `MCP: ${serverName}/${toolName}`,
        input: {
          serverName,
          toolName,
          toolInput: event.tool_input,
        },
        kind: TOOL_KIND.OTHER,
      };
    }
    case CURSOR_HOOK_EVENT.BEFORE_READ_FILE: {
      const path = asNonEmptyString(event.path) ?? "unknown";
      return {
        toolCallKey: "tool:read_file",
        title: `Read file: ${path}`,
        input: { path },
        kind: TOOL_KIND.READ,
      };
    }
    case CURSOR_HOOK_EVENT.PRE_TOOL_USE: {
      const toolName = asNonEmptyString(event.tool_name) ?? "tool";
      return {
        toolCallKey: `tool:${toolName}`,
        title: toolName,
        input: {
          toolName,
          toolInput: event.tool_input,
        },
        kind: inferCursorToolKind(toolName),
      };
    }
    default:
      return {
        toolCallKey: `permission:${event.hook_event_name}`,
        title: "Permission request",
        input: {},
        kind: TOOL_KIND.OTHER,
      };
  }
};
