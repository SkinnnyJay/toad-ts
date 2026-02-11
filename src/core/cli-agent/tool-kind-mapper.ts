import { TOOL_KIND, type ToolKind } from "@/constants/tool-kinds";

export const inferToolKindFromName = (toolName: string): ToolKind => {
  const normalized = toolName.toLowerCase();
  if (normalized.includes("read")) return TOOL_KIND.READ;
  if (normalized.includes("search") || normalized.includes("grep") || normalized.includes("glob")) {
    return TOOL_KIND.SEARCH;
  }
  if (normalized.includes("edit") || normalized.includes("write") || normalized.includes("patch")) {
    return TOOL_KIND.EDIT;
  }
  if (normalized.includes("delete") || normalized.includes("remove")) return TOOL_KIND.DELETE;
  if (normalized.includes("move") || normalized.includes("rename")) return TOOL_KIND.MOVE;
  if (normalized.includes("shell") || normalized.includes("exec") || normalized.includes("bash")) {
    return TOOL_KIND.EXECUTE;
  }
  if (normalized.includes("fetch") || normalized.includes("http")) return TOOL_KIND.FETCH;
  if (normalized.includes("think")) return TOOL_KIND.THINK;
  return TOOL_KIND.OTHER;
};
