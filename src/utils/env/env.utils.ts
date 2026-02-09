import { type DotenvConfigOutput, config } from "dotenv";

export interface EnvManagerOptions {
  readonly envPath?: string;
  readonly envPaths?: readonly string[];
}

export function parseNumberEnvValue(rawValue: string, defaultValue: number): number {
  const parsedValue: number = Number(rawValue);
  return Number.isNaN(parsedValue) ? defaultValue : parsedValue;
}

export function parseBooleanEnvValue(rawValue: string, defaultValue: boolean): boolean {
  const normalizedValue: string = rawValue.toLowerCase();
  if (normalizedValue === "true" || normalizedValue === "1") {
    return true;
  }
  if (normalizedValue === "false" || normalizedValue === "0") {
    return false;
  }
  return defaultValue;
}

export class EnvManager {
  private static instance: EnvManager | null = null;
  private static bootstrapped = false;

  private readonly envCache: Map<string, string>;

  private constructor(options?: EnvManagerOptions) {
    this.envCache = new Map<string, string>();
    this.loadEnvFiles(options);
    this.snapshotProcessEnv();
  }

  public static bootstrap(paths: readonly string[] = [".env.local", ".env"]): void {
    if (EnvManager.bootstrapped) {
      return;
    }

    for (const envPath of paths) {
      const result: DotenvConfigOutput = config({ path: envPath, quiet: true });
      if (result.parsed) {
        process.stderr.write(`[EnvManager] Loaded: ${envPath}\n`);
      }
    }

    EnvManager.bootstrapped = true;
  }

  public static isBootstrapped(): boolean {
    return EnvManager.bootstrapped;
  }

  public static resetBootstrap(): void {
    EnvManager.bootstrapped = false;
  }

  public static getInstance(options?: EnvManagerOptions): EnvManager {
    if (EnvManager.instance) {
      return EnvManager.instance;
    }

    EnvManager.instance = new EnvManager(options);
    return EnvManager.instance;
  }

  public static resetInstance(): void {
    EnvManager.instance = null;
  }

  public getEnvironment(): string {
    const rawEnv: string | undefined = process.env.NODE_ENV;
    return rawEnv ?? "development";
  }

  public isProduction(): boolean {
    return this.getEnvironment() === "production";
  }

  public has(key: string): boolean {
    return this.envCache.has(key);
  }

  public getSnapshot(): Record<string, string | undefined> {
    return Object.fromEntries(this.envCache);
  }

  public getValue(key: string): string | undefined {
    return this.envCache.get(key);
  }

  public getValueOrDefault(key: string, defaultValue: string): string {
    const rawValue: string | undefined = this.envCache.get(key);
    return rawValue ?? defaultValue;
  }

  public getString(key: string, defaultValue = ""): string {
    return this.getValueOrDefault(key, defaultValue);
  }

  public getNumber(key: string, defaultValue = 0): number {
    const rawValue: string | undefined = this.envCache.get(key);
    if (rawValue === undefined) {
      return defaultValue;
    }

    return parseNumberEnvValue(rawValue, defaultValue);
  }

  public getBoolean(key: string, defaultValue = false): boolean {
    const rawValue: string | undefined = this.envCache.get(key);
    if (rawValue === undefined) {
      return defaultValue;
    }

    return parseBooleanEnvValue(rawValue, defaultValue);
  }

  private loadEnvFiles(options?: EnvManagerOptions): void {
    const envPaths: readonly string[] = this.determineEnvPaths(options);

    for (const envPath of envPaths) {
      const result: DotenvConfigOutput = config({ path: envPath, quiet: true });
      if (!result.parsed) {
        continue;
      }
      for (const [key, value] of Object.entries(result.parsed)) {
        this.envCache.set(key, value);
      }
    }
  }

  private snapshotProcessEnv(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) {
        continue;
      }
      this.envCache.set(key, value);
    }
  }

  private determineEnvPaths(options?: EnvManagerOptions): readonly string[] {
    if (options?.envPaths && options.envPaths.length > 0) {
      return options.envPaths;
    }

    if (options?.envPath) {
      return [options.envPath];
    }

    return [".env.local", ".env"];
  }
}

export class Env {
  private readonly envManager: EnvManager;

  public constructor(envManager: EnvManager) {
    this.envManager = envManager;
  }

  public getString(key: string, defaultValue = ""): string {
    return this.envManager.getString(key, defaultValue);
  }

  public getNumber(key: string, defaultValue = 0): number {
    return this.envManager.getNumber(key, defaultValue);
  }

  public getBoolean(key: string, defaultValue = false): boolean {
    return this.envManager.getBoolean(key, defaultValue);
  }
}
