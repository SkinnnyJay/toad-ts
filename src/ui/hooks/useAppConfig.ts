import type { AppConfig, AppConfigInput } from "@/config/app-config";
import {
  DEFAULT_APP_CONFIG,
  loadAppConfig,
  mergeAppConfig,
  saveAppConfig,
} from "@/config/app-config";
import { createClassLogger } from "@/utils/logging/logger.utils";
import { useCallback, useEffect, useRef, useState } from "react";

const logger = createClassLogger("useAppConfig");

export interface UseAppConfigResult {
  config: AppConfig;
  isLoading: boolean;
  loadError?: string;
  updateConfig: (update: AppConfigInput) => Promise<void>;
}

export const useAppConfig = (): UseAppConfigResult => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

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

  const updateConfig = useCallback(async (update: AppConfigInput) => {
    const next = mergeAppConfig(configRef.current, update);
    setConfig(next);
    try {
      await saveAppConfig(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Failed to save config", { error: message });
      setLoadError(message);
    }
  }, []);

  return { config, isLoading, loadError, updateConfig };
};
