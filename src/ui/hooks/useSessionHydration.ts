import { UI } from "@/config/ui";
import { RENDER_STAGE, type RenderStage } from "@/constants/render-stage";
import { createDefaultHarnessConfig } from "@/harness/defaultHarnessConfig";
import { loadHarnessConfig } from "@/harness/harnessConfig";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { PersistenceManager } from "@/store/persistence/persistence-manager";
import type { AgentId } from "@/types/domain";
import { AgentIdSchema } from "@/types/domain";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { useEffect, useState } from "react";

export interface AgentInfo {
  id: AgentId;
  harnessId: string;
  name: string;
  description?: string;
}

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
}

/**
 * Builds agent options and info map from harness configurations.
 */
export const buildAgentOptions = (
  harnesses: Record<string, HarnessConfig>
): { options: AgentOption[]; infoMap: Map<AgentId, AgentInfo> } => {
  const options: AgentOption[] = [];
  const infoMap = new Map<AgentId, AgentInfo>();

  for (const config of Object.values(harnesses)) {
    const id = AgentIdSchema.parse(config.id);
    const info: AgentInfo = {
      id,
      harnessId: config.id,
      name: config.name,
      description: config.description,
    };
    options.push({ id, name: info.name, description: info.description });
    infoMap.set(id, info);
  }

  return { options, infoMap };
};

/**
 * Hook to handle session hydration and harness configuration loading.
 * Manages the initial loading state of the application.
 */
export function useSessionHydration({
  persistenceManager,
  initialProgress = 5,
  initialStatusMessage = "Preparing…",
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

    void (async () => {
      try {
        await persistenceManager.hydrate();
        if (!active) return;
        persistenceManager.start();
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

    void (async () => {
      try {
        const config = await loadHarnessConfig();
        if (!active) return;
        setHarnessConfigs(config.harnesses);
        const { options, infoMap } = buildAgentOptions(config.harnesses);
        setAgentOptions(options);
        setAgentInfoMap(infoMap);
        setHasHarnesses(true);
        const parsedDefault = AgentIdSchema.safeParse(config.harnessId);
        setDefaultAgentId(parsedDefault.success ? parsedDefault.data : null);
        setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADED));
      } catch (error) {
        const fallback = createDefaultHarnessConfig();
        if (!active) return;
        setLoadError(null);
        setHarnessConfigs(fallback.harnesses);
        const { options, infoMap } = buildAgentOptions(fallback.harnesses);
        setAgentOptions(options);
        setAgentInfoMap(infoMap);
        setHasHarnesses(true);
        setDefaultAgentId(AgentIdSchema.parse(fallback.harnessId));
        if (error instanceof Error && error.message !== "No harnesses configured.") {
          setLoadError(error.message);
        }
        setProgress((current) => Math.max(current, UI.PROGRESS.CONFIG_LOADED));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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
