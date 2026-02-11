import { ALLOW_ALWAYS, ALLOW_ONCE } from "@/constants/permission-option-kinds";
import { PERMISSION, type Permission } from "@/constants/permissions";
import { TOOL_KIND, type ToolKind } from "@/constants/tool-kinds";
import { getRulesState } from "@/rules/rules-service";
import type {
  PermissionOption,
  RequestPermissionRequest,
  RequestPermissionResponse,
} from "@agentclientprotocol/sdk";

export type ToolPermissionOverrides = Partial<Record<ToolKind, Permission>>;

const DEFAULT_PERMISSIONS: Record<ToolKind, Permission> = {
  [TOOL_KIND.READ]: PERMISSION.ALLOW,
  [TOOL_KIND.SEARCH]: PERMISSION.ALLOW,
  [TOOL_KIND.FETCH]: PERMISSION.ALLOW,
  [TOOL_KIND.EDIT]: PERMISSION.ASK,
  [TOOL_KIND.EXECUTE]: PERMISSION.ASK,
  [TOOL_KIND.DELETE]: PERMISSION.DENY,
  [TOOL_KIND.MOVE]: PERMISSION.ASK,
  [TOOL_KIND.THINK]: PERMISSION.ALLOW,
  [TOOL_KIND.SWITCH_MODE]: PERMISSION.ALLOW,
  [TOOL_KIND.OTHER]: PERMISSION.ASK,
};

const selectOption = (
  options: PermissionOption[],
  permission: Permission
): PermissionOption | undefined => {
  if (options.length === 0) {
    return undefined;
  }

  const allowKinds: string[] = [ALLOW_ALWAYS, ALLOW_ONCE];

  if (permission === PERMISSION.ALLOW) {
    return options.find((option) => allowKinds.includes(option.kind)) ?? options[0];
  }

  if (permission === PERMISSION.DENY) {
    return (
      options.find((option) => option.kind === "reject_always" || option.kind === "reject_once") ??
      options[0]
    );
  }

  return options.find((option) => option.kind === ALLOW_ONCE) ?? options[0];
};

export const createPermissionHandler = (
  overrides: ToolPermissionOverrides = {}
): ((request: RequestPermissionRequest) => Promise<RequestPermissionResponse>) => {
  return async (request) => {
    const kind = request.toolCall.kind ?? TOOL_KIND.OTHER;
    const { permissions } = getRulesState();
    const permission =
      permissions[kind] ?? overrides[kind] ?? DEFAULT_PERMISSIONS[kind] ?? PERMISSION.ASK;
    const selected = selectOption(request.options, permission);
    if (!selected) {
      return { outcome: { outcome: "cancelled" } };
    }
    return { outcome: { outcome: "selected", optionId: selected.optionId } };
  };
};
