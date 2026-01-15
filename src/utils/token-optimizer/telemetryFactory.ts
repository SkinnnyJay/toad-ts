import { EnvManager } from "@/shared/utils/env/env.utils";
import { createAnalyticsTelemetryStorage } from "./analyticsTelemetryStorage";
import { analytics } from "./stubs/analytics";
import {
  type JsonTelemetryStorageConfig,
  type TelemetryStorage,
  createJsonTelemetryStorage,
  telemetryStorageKindSchema,
} from "./telemetryStorage";

export interface TelemetryFactoryOptions {
  readonly jsonConfig?: JsonTelemetryStorageConfig;
  readonly environment?: NodeJS.ProcessEnv;
  /** Compression type being used (for analytics tracking) */
  readonly compressionType?: string;
  /** Agent ID for analytics context */
  readonly agentId?: string;
  /** Chat ID for analytics context */
  readonly chatId?: string;
  /** Whether to also write to JSON file (default: true) */
  readonly useJsonFallback?: boolean;
}

const DEFAULT_JSON_PATH = "./data/telemetry/analytics.json";

export const createTelemetryStorage = (options?: TelemetryFactoryOptions): TelemetryStorage => {
  const getEnvValue = (key: string, defaultValue: string): string => {
    if (options?.environment?.[key] !== undefined) {
      return options.environment[key] ?? defaultValue;
    }
    const envManager = EnvManager.getInstance();
    return envManager.getString(key, defaultValue);
  };

  const rawKind = getEnvValue("TELEMETRY_STORAGE_KIND", "JSON");
  const kind = telemetryStorageKindSchema.parse(rawKind.toUpperCase());

  // Create JSON storage as fallback/primary depending on config
  const jsonFilePath = getEnvValue("TELEMETRY_JSON_PATH", DEFAULT_JSON_PATH);
  const jsonConfig = options?.jsonConfig ?? { filePath: jsonFilePath };
  const jsonStorage = createJsonTelemetryStorage(jsonConfig);

  // Check if analytics integration is enabled
  const enableAnalytics = getEnvValue("TOKEN_OPTIMIZER_ANALYTICS_ENABLED", "true") !== "false";

  if (enableAnalytics) {
    // Create analytics-integrated storage
    const useJsonFallback = options?.useJsonFallback ?? true;

    return createAnalyticsTelemetryStorage({
      analyticsService: analytics,
      compressionType: options?.compressionType,
      agentId: options?.agentId,
      chatId: options?.chatId,
      fallbackStorage: useJsonFallback ? jsonStorage : undefined,
    });
  }

  // Fallback to JSON-only storage
  if (kind === "JSON") {
    return jsonStorage;
  }

  // Exhaustive guard to satisfy TypeScript when future kinds are added.
  throw new Error(`Unsupported telemetry storage kind: ${kind}`);
};
