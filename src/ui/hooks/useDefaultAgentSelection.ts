import type { AgentInfo } from "@/agents/agent-manager";
import { UI } from "@/config/ui";
import { RENDER_STAGE, type RenderStage } from "@/constants/render-stage";
import { VIEW, type View } from "@/constants/views";
import { getDefaultProvider } from "@/store/settings/settings-manager";
import type { AgentId } from "@/types/domain";
import { useEffect, useState } from "react";

const clearScreen = (): void => {
  process.stdout.write("\x1b[3J\x1b[H\x1b[2J");
};

export interface UseDefaultAgentSelectionOptions {
  isHydrated: boolean;
  hasHarnesses: boolean;
  agentInfoMap: Map<AgentId, AgentInfo>;
  defaultAgentId: AgentId | null;
  onStageChange: (stage: RenderStage) => void;
  onProgressChange: (progress: number | ((current: number) => number)) => void;
  onStatusMessageChange: (message: string) => void;
  onViewChange: (view: View) => void;
}

export interface UseDefaultAgentSelectionResult {
  selectedAgent: AgentInfo | null;
  selectAgent: (agent: AgentInfo) => void;
}

/**
 * Hook to handle automatic agent selection based on settings or config defaults.
 * Checks for a default provider in settings, falls back to harness config default,
 * or shows the agent selection screen.
 */
export function useDefaultAgentSelection({
  isHydrated,
  hasHarnesses,
  agentInfoMap,
  defaultAgentId,
  onStageChange,
  onProgressChange,
  onStatusMessageChange,
  onViewChange,
}: UseDefaultAgentSelectionOptions): UseDefaultAgentSelectionResult {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  const selectAgent = (agent: AgentInfo) => {
    clearScreen();
    onStatusMessageChange(`Connecting to ${agent.name}…`);
    onProgressChange((current) => Math.max(current, UI.PROGRESS.CONNECTION_START));
    onStageChange(RENDER_STAGE.CONNECTING);
    setSelectedAgent(agent);
    onViewChange(VIEW.CHAT);
  };

  useEffect(() => {
    if (!isHydrated || !hasHarnesses || selectedAgent) {
      return;
    }

    let active = true;

    // Check for default provider from settings
    void (async () => {
      try {
        const defaultProvider = await getDefaultProvider();
        if (!active) return;
        if (defaultProvider?.agentId) {
          const info = agentInfoMap.get(defaultProvider.agentId);
          if (info) {
            clearScreen();
            onStatusMessageChange(`Connecting to ${info.name}…`);
            onProgressChange((current) => Math.max(current, UI.PROGRESS.CONNECTION_START));
            onStageChange(RENDER_STAGE.CONNECTING);
            setSelectedAgent(info);
            onViewChange(VIEW.CHAT);
            return;
          }
        }
      } catch (_error) {
        // If settings load fails, fall through to default behavior
        if (!active) return;
      }

      // Fallback to harness config default or show agent select
      if (defaultAgentId) {
        const info = agentInfoMap.get(defaultAgentId);
        if (info) {
          clearScreen();
          onStatusMessageChange(`Connecting to ${info.name}…`);
          onProgressChange((current) => Math.max(current, UI.PROGRESS.CONNECTION_START));
          onStageChange(RENDER_STAGE.CONNECTING);
          setSelectedAgent(info);
          onViewChange(VIEW.CHAT);
          return;
        }
      }

      if (!active) return;
      clearScreen();
      onStageChange(RENDER_STAGE.READY);
      onProgressChange((current) => Math.max(current, UI.PROGRESS.COMPLETE));
      onViewChange(VIEW.AGENT_SELECT);
      onStatusMessageChange("Select a provider");
    })();

    return () => {
      active = false;
    };
  }, [
    agentInfoMap,
    defaultAgentId,
    hasHarnesses,
    isHydrated,
    selectedAgent,
    onStageChange,
    onProgressChange,
    onStatusMessageChange,
    onViewChange,
  ]);

  return { selectedAgent, selectAgent };
}
