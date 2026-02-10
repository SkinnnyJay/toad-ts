import type { AppConfig } from "@/config/app-config";
import { DEFAULT_APP_CONFIG, loadAppConfig } from "@/config/app-config";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { useEffect, useState } from "react";

const logger = createClassLogger("useAppConfig");

export interface UseAppConfigResult {
  config: AppConfig;
  isLoading: boolean;
  loadError?: string;
}

export const useAppConfig = (): UseAppConfigResult => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const loaded = await loadAppConfig();
        if (!active) return;
        setConfig(loaded);
        setLoadError(undefined);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : String(error);
        logger.warn("Failed to load config", { error: message });
        setLoadError(message);
        setConfig(DEFAULT_APP_CONFIG);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { config, isLoading, loadError };
};
