import type { AgentPort, AgentPortEvents } from "@/core/agent-port";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { z } from "zod";

export type HarnessRuntimeEvents = AgentPortEvents;
export type HarnessRuntime = AgentPort;

export interface HarnessAdapter<TConfig extends HarnessConfig = HarnessConfig> {
  readonly id: string;
  readonly name: string;
  readonly configSchema: z.ZodType<TConfig, z.ZodTypeDef, unknown>;
  createHarness(config: TConfig): HarnessRuntime;
}
