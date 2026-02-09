import type { ACPClientOptions, ACPConnectionLike } from "@/core/acp-client";
import { ACPClient } from "@/core/acp-client";
import type { AgentPort } from "@/core/agent-port";

export interface ACPAgentPortOptions {
  connection: ACPConnectionLike;
  clientOptions?: ACPClientOptions;
}

export const createAcpAgentPort = (options: ACPAgentPortOptions): AgentPort => {
  const client = new ACPClient(options.connection, options.clientOptions);
  return client as AgentPort;
};
