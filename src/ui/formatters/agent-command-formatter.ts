import type {
  CliAgentLoginResult,
  CliAgentMcpServer,
  CliAgentModelsResult,
  CliAgentStatusResult,
} from "@/types/cli-agent.types";

export const formatLoginResult = (result: CliAgentLoginResult, agentName: string): string[] => {
  if (!result.supported) {
    return [`${agentName}: login is not supported.`];
  }
  const lines: string[] = [];
  if (result.command) {
    lines.push(`Run \`${result.command}\` in a terminal.`);
  }
  if (result.requiresBrowser) {
    lines.push("Login will open a browser for authentication.");
  }
  if (result.requiredEnvVar) {
    lines.push(`Set ${result.requiredEnvVar} before logging in.`);
  }
  if (result.message) {
    lines.push(result.message);
  }
  return lines.length > 0 ? lines : [`${agentName}: login is available.`];
};

export const formatStatusResult = (result: CliAgentStatusResult): string[] => {
  if (!result.supported) {
    return ["Status command is not supported."];
  }
  const lines: string[] = [];
  if (typeof result.authenticated === "boolean") {
    lines.push(`Authenticated: ${result.authenticated ? "yes" : "no"}`);
  }
  if (result.email) {
    lines.push(`Email: ${result.email}`);
  }
  if (result.method) {
    lines.push(`Method: ${result.method}`);
  }
  if (result.version) {
    lines.push(`Version: ${result.version}`);
  }
  if (result.model) {
    lines.push(`Model: ${result.model}`);
  }
  if (result.message) {
    lines.push(`Status: ${result.message}`);
  }
  return lines.length > 0 ? lines : ["Status command produced no output."];
};

export const formatMcpList = (servers: CliAgentMcpServer[], agentName: string): string[] => {
  if (servers.length === 0) {
    return [`No MCP servers returned by ${agentName}.`];
  }
  return servers.map((server) => {
    const reasonSuffix = server.reason ? ` (${server.reason})` : "";
    return `- ${server.name}: ${server.status}${reasonSuffix}`;
  });
};

export const formatModelsResult = (result: CliAgentModelsResult, agentName: string): string[] => {
  if (!result.supported) {
    return [`${agentName}: model listing is not supported.`];
  }
  if (result.models.length === 0) {
    return [result.message ?? `No models returned by ${agentName}.`];
  }
  const lines = result.models.map((modelId) => `- ${modelId}`);
  if (result.activeModel) {
    lines.push(`Active model: ${result.activeModel}`);
  }
  if (result.message) {
    lines.push(result.message);
  }
  return lines;
};
