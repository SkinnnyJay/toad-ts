import type { AgentInfo } from "@/agents/agent-manager";
import type { EnvSource, McpConfigInput } from "@/core/mcp-config";
import { loadMcpConfig } from "@/core/mcp-config-loader";
import { SessionManager } from "@/core/session-manager";
import type { SessionStream } from "@/core/session-stream";
import type { HarnessConfig } from "@/harness/harnessConfig";
import type { HarnessRegistry } from "@/harness/harnessRegistry";
import type { AppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { EnvManager } from "@/utils/env/env.utils";
import { createClassLogger } from "@/utils/logging/logger.utils";

export interface SubAgentRunnerOptions {
  harnessRegistry: HarnessRegistry;
  harnessConfigs: Record<string, HarnessConfig>;
  sessionStream: SessionStream;
  store: Pick<AppStore, "upsertSession">;
  env?: EnvSource;
}

export interface SubAgentRunParams {
  parentSessionId: SessionId;
  agent: AgentInfo;
  prompt: string;
  cwd?: string;
  mcpConfig?: McpConfigInput | null;
}

export class SubAgentRunner {
  private readonly logger = createClassLogger("SubAgentRunner");

  constructor(private readonly options: SubAgentRunnerOptions) {}

  async run(params: SubAgentRunParams): Promise<SessionId> {
    const harnessConfig = this.options.harnessConfigs[params.agent.harnessId];
    if (!harnessConfig) {
      throw new Error(`Harness '${params.agent.harnessId}' not configured.`);
    }
    const adapter = this.options.harnessRegistry.get(harnessConfig.id);
    if (!adapter) {
      throw new Error(`Harness adapter '${harnessConfig.id}' not registered.`);
    }

    const effectiveConfig: HarnessConfig = {
      ...harnessConfig,
      permissions: params.agent.permissions ?? harnessConfig.permissions,
    };

    const runtime = adapter.createHarness(effectiveConfig);
    const detach = this.options.sessionStream.attach(runtime);
    const env = this.options.env ?? EnvManager.getInstance().getSnapshot();
    const sessionManager = new SessionManager(runtime, this.options.store);

    try {
      await runtime.connect();
      await runtime.initialize();
      const mcpConfig = params.mcpConfig ?? (await loadMcpConfig());
      const session = await sessionManager.createSession({
        cwd: params.cwd ?? process.cwd(),
        agentId: params.agent.id,
        title: params.agent.name,
        mcpConfig,
        env,
        mode: params.agent.sessionMode,
        model: params.agent.model,
        temperature: params.agent.temperature,
        parentSessionId: params.parentSessionId,
      });
      await runtime.prompt({
        sessionId: session.id,
        prompt: [{ type: "text", text: params.prompt }],
      });
      return session.id;
    } catch (error) {
      this.logger.error("Subagent run failed", {
        agentId: params.agent.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      detach();
      await runtime.disconnect();
    }
  }
}
