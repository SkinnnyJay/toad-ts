import { type AgentConfig, loadAgentConfigs } from "@/agents/agent-config";
import { AgentManager } from "@/agents/agent-manager";
import type { AgentInfo } from "@/agents/agent-manager";
import { SESSION_HYDRATION_INITIAL_PROGRESS } from "@/config/limits";
import { UI } from "@/config/ui";
import { PERFORMANCE_MARK, PERFORMANCE_MEASURE } from "@/constants/performance-marks";
import { RENDER_STAGE, type RenderStage } from "@/constants/render-stage";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { loadHarnessConfig } from "@/harness/harnessConfig";
import type { HarnessConfig } from "@/harness/harnessConfig";
import { loadRules } from "@/rules/rules-loader";
import { setRulesState } from "@/rules/rules-service";
import type { PersistenceManager } from "@/store/persistence/persistence-manager";
import type { AgentId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { useEffect, useState } from "react";

export interface UseSessionHydrationResult {
  isHydrated: boolean;
  hasHarnesses: boolean;
  harnessConfigs: Record<string, HarnessConfig>;
  agentOptions: AgentOption[];
  agentInfoMap: Map<AgentId, AgentInfo>;
  defaultAgentId: AgentId | null;
  loadError: string | null;
  stage: RenderStage;
  progress: number;
  statusMessage: string;
  setStage: (stage: RenderStage) => void;
  setProgress: (progress: number | ((current: number) => number)) => void;
  setStatusMessage: (message: string) => void;
  setLoadError: (error: string | null) => void;
}

export interface UseSessionHydrationOptions {
  persistenceManager: PersistenceManager;
  initialProgress?: number;
  initialStatusMessage?: string;
  enabledHarnessIds?: Set<string>;
}

/**
 * Builds agent options and info map from harness configurations and custom agents.
 */
export const buildAgentOptions = (
  harnesses: Record<string, HarnessConfig>,
  customAgents: AgentConfig[] = []
): { options: AgentOption[]; infoMap: Map<AgentId, AgentInfo> } => {
  const agentManager = new AgentManager({ harnesses, customAgents });
  return agentManager.buildAgentOptions();
};

export const filterHarnessConfigs = (
  harnesses: Record<string, HarnessConfig>,
  enabledHarnessIds?: Set<string>
): Record<string, HarnessConfig> => {
  if (!enabledHarnessIds || enabledHarnessIds.size === 0) {
    return harnesses;
  }

  const filteredEntries = Object.entries(harnesses).filter(([id]) => enabledHarnessIds.has(id));
  if (filteredEntries.length === 0) {
    return harnesses;
  }

  return Object.fromEntries(filteredEntries);
};

/**
 * Hook to handle session hydration and harness configuration loading.
 * Manages the initial loading state of the application.
 */
export function useSessionHydration({
  persistenceManager,
  initialProgress = SESSION_HYDRATION_INITIAL_PROGRESS,
  initialStatusMessage = "Preparing…",
  enabledHarnessIds,
}: UseSessionHydrationOptions): UseSessionHydrationResult {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasHarnesses, setHasHarnesses] = useState(false);
  const [harnessConfigs, setHarnessConfigs] = useState<Record<string, HarnessConfig>>({});
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [agentInfoMap, setAgentInfoMap] = useState<Map<AgentId, AgentInfo>>(new Map());
  const [defaultAgentId, setDefaultAgentId] = useState<AgentId | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<RenderStage>(RENDER_STAGE.LOADING);
  const [progress, setProgress] = useState<number>(initialProgress);
  const [statusMessage, setStatusMessage] = useState<string>(initialStatusMessage);

  // Hydrate persistence
  useEffect(() => {
    let active = true;
    setStatusMessage("Hydrating sessions…");
    setProgress((current) => Math.max(current, UI.PROGRESS.INITIAL));
    performance.mark(PERFORMANCE_MARK.SESSION_LOAD_START);

    void (async () => {
      try {
        await persistenceManager.hydrate();
        if (!active) return;
        persistenceManager.start();
        performance.mark(PERFORMANCE_MARK.SESSION_LOAD_END);
        performance.measure(
          PERFORMANCE_MEASURE.SESSION_LOAD,
          PERFORMANCE_MARK.SESSION_LOAD_START,
          PERFORMANCE_MARK.SESSION_LOAD_END
        );
        setIsHydrated(true);
        setProgress((current) => Math.max(current, UI.PROGRESS.HARNESS_LOADING));
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
        setStage(RENDER_STAGE.ERROR);
        setStatusMessage(message);
      }
    })();

    return () => {
      active = false;
      void persistenceManager.close();
    };
  }, [persistenceManager]);

  // Load harness configurations
  useEffect(() => {
    let active = true;
    setStatusMessage("Loading providers…");
    setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADING));

    const loadRulesState = async (): Promise<void> => {
      try {
        const rules = await loadRules({ projectRoot: process.cwd() });
        if (!active) return;
        setRulesState(rules);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
      }
    };

    void (async () => {
      try {
        const config = await loadHarnessConfig();
        if (!active) return;
        const filteredHarnesses = filterHarnessConfigs(config.harnesses, enabledHarnessIds);
        setHarnessConfigs(filteredHarnesses);
        const defaultHarnessId = filteredHarnesses[config.harnessId]
          ? config.harnessId
          : (Object.keys(filteredHarnesses)[0] ?? config.harnessId);
        const customAgents = await loadAgentConfigs({
          projectRoot: process.cwd(),
          defaultHarnessId,
        });
        const { options, infoMap } = buildAgentOptions(filteredHarnesses, customAgents);
        setAgentOptions(options);
        setAgentInfoMap(infoMap);
        setHasHarnesses(true);
        const parsedDefault = AgentIdSchema.safeParse(defaultHarnessId);
        const defaultAgent = parsedDefault.success ? infoMap.get(parsedDefault.data) : undefined;
        setDefaultAgentId(defaultAgent?.id ?? null);
        await loadRulesState();
        setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADED));
      } catch (error) {
        const fallback = createDefaultHarnessConfig();
        if (!active) return;
        setLoadError(null);
        const filteredHarnesses = filterHarnessConfigs(fallback.harnesses, enabledHarnessIds);
        setHarnessConfigs(filteredHarnesses);
        const defaultHarnessId = filteredHarnesses[fallback.harnessId]
          ? fallback.harnessId
          : (Object.keys(filteredHarnesses)[0] ?? fallback.harnessId);
        const { options, infoMap } = buildAgentOptions(filteredHarnesses, []);
        setAgentOptions(options);
        setAgentInfoMap(infoMap);
        setHasHarnesses(true);
        const parsedDefault = AgentIdSchema.safeParse(defaultHarnessId);
        const defaultAgent = parsedDefault.success ? infoMap.get(parsedDefault.data) : undefined;
        setDefaultAgentId(defaultAgent?.id ?? null);
        if (error instanceof Error && error.message !== "No harnesses configured.") {
          setLoadError(error.message);
        }
        await loadRulesState();
        setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADED));
      }
    })();

    return () => {
      active = false;
    };
  }, [enabledHarnessIds]);

  return {
    isHydrated,
    hasHarnesses,
    harnessConfigs,
    agentOptions,
    agentInfoMap,
    defaultAgentId,
    loadError,
    stage,
    progress,
    statusMessage,
    setStage,
    setProgress,
    setStatusMessage,
    setLoadError,
  };
}
