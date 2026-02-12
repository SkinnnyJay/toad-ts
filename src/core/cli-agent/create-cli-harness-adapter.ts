import type { HarnessAdapter, HarnessRuntime } from "@/harness/harnessAdapter";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { z } from "zod";

export interface CreateCliHarnessAdapterOptions<TConfig extends HarnessConfig> {
  id: string;
  name: string;
  configSchema: z.ZodType<TConfig, z.ZodTypeDef, unknown>;
  createRuntime: (config: TConfig) => HarnessRuntime;
}

export const createCliHarnessAdapter = <TConfig extends HarnessConfig>(
  options: CreateCliHarnessAdapterOptions<TConfig>
): HarnessAdapter<TConfig> => {
  return {
    id: options.id,
    name: options.name,
    configSchema: options.configSchema,
    createHarness: (config) => options.createRuntime(config),
  };
};
