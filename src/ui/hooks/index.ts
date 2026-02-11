/**
 * UI Hooks
 *
 * Reusable hooks extracted from UI components for better testability,
 * reusability, and separation of concerns.
 */

// App.tsx hooks
export { useTerminalDimensions } from "./useTerminalDimensions";
export type { TerminalDimensions } from "./useTerminalDimensions";

export { useSessionHydration, buildAgentOptions } from "./useSessionHydration";
export type { UseSessionHydrationResult, UseSessionHydrationOptions } from "./useSessionHydration";
export type { AgentInfo } from "@/agents/agent-manager";

export {
  useHarnessConnection,
  formatHarnessError,
} from "./useHarnessConnection";
export type {
  UseHarnessConnectionOptions,
  UseHarnessConnectionResult,
} from "./useHarnessConnection";

export { useDefaultAgentSelection } from "./useDefaultAgentSelection";
export type {
  UseDefaultAgentSelectionOptions,
  UseDefaultAgentSelectionResult,
} from "./useDefaultAgentSelection";

export {
  useAppKeyboardShortcuts,
  FOCUS_NUMBER_MAP,
  isOptionBacktick,
} from "./useAppKeyboardShortcuts";
export type {
  UseAppKeyboardShortcutsOptions,
  UseAppKeyboardShortcutsResult,
} from "./useAppKeyboardShortcuts";

export { useCheckpointUI } from "./useCheckpointUI";
export type { UseCheckpointUIOptions, UseCheckpointUIResult } from "./useCheckpointUI";

export { useExecutionEngine } from "./useExecutionEngine";
export type { UseExecutionEngineOptions } from "./useExecutionEngine";

export { useAppNavigation } from "./useAppNavigation";
export type { UseAppNavigationOptions, UseAppNavigationResult } from "./useAppNavigation";

export { useAppConfig } from "./useAppConfig";
export type { UseAppConfigResult } from "./useAppConfig";

export { useHookManager } from "./useHookManager";
export type { UseHookManagerOptions } from "./useHookManager";

export { useContextStats } from "./useContextStats";
export type { ContextStats } from "./useContextStats";

// InputWithAutocomplete.tsx hooks
export {
  useProjectFiles,
  createIgnoreFilter,
} from "./useProjectFiles";
export type {
  UseProjectFilesResult,
  UseProjectFilesOptions,
} from "./useProjectFiles";

export {
  useMentionSuggestions,
  extractMentionQuery,
} from "./useMentionSuggestions";
export type {
  UseMentionSuggestionsOptions,
  UseMentionSuggestionsResult,
} from "./useMentionSuggestions";

// ToolCallManager.tsx hooks
export {
  useToolCalls,
  mapBlockStatusToToolStatus,
  extractToolCallsFromMessages,
} from "./useToolCalls";
export type {
  ToolCall,
  UseToolCallsResult,
} from "./useToolCalls";

export { useToolApprovals } from "./useToolApprovals";
export type {
  UseToolApprovalsOptions,
  UseToolApprovalsResult,
} from "./useToolApprovals";

// ScrollArea.tsx hooks
export {
  useScrollState,
  calculateScrollbarProps,
} from "./useScrollState";
export type {
  UseScrollStateOptions,
  UseScrollStateResult,
} from "./useScrollState";

// Sidebar.tsx hooks
export {
  useAccordionState,
  isSidebarSection,
} from "./useAccordionState";
export type { UseAccordionStateResult } from "./useAccordionState";

export { useSessionNavigation } from "./useSessionNavigation";
export type {
  UseSessionNavigationOptions,
  UseSessionNavigationResult,
} from "./useSessionNavigation";

// Chat.tsx hooks
export {
  useSlashCommands,
  parseSlashCommand,
} from "./useSlashCommands";
export type {
  UseSlashCommandsOptions,
  UseSlashCommandsResult,
} from "./useSlashCommands";

export { useUiSymbols } from "./useUiSymbols";

export { useRepoWorkflow } from "./useRepoWorkflow";
export type {
  UseRepoWorkflowOptions,
  UseRepoWorkflowResult,
} from "./useRepoWorkflow";

export { useCursorCloudAgentCount } from "./useCursorCloudAgentCount";
export type {
  UseCursorCloudAgentCountOptions,
  UseCursorCloudAgentCountResult,
} from "./useCursorCloudAgentCount";
export { useCursorNativeSessionIds } from "./useCursorNativeSessionIds";
export type {
  UseCursorNativeSessionIdsOptions,
  UseCursorNativeSessionIdsResult,
} from "./useCursorNativeSessionIds";

export { useRandomFact, useRotatingFact } from "./useRandomFact";
export type {
  UseRandomFactResult,
  UseRotatingFactResult,
} from "./useRandomFact";
