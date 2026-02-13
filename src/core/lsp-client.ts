import { createClassLogger } from "@/utils/logging/logger.utils";
import { execa } from "execa";

const logger = createClassLogger("LSPClient");

export interface LSPServerConfig {
  command: string;
  args: string[];
  languages: string[];
}

export interface LSPSymbol {
  name: string;
  kind: string;
  location: { file: string; line: number; column: number };
}

export interface LSPHoverResult {
  contents: string;
  range?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

/**
 * Detect available language servers on the system.
 */
export const detectLanguageServers = async (): Promise<LSPServerConfig[]> => {
  const servers: LSPServerConfig[] = [];

  const candidates: Array<{ command: string; args: string[]; languages: string[] }> = [
    {
      command: "typescript-language-server",
      args: ["--stdio"],
      languages: ["typescript", "javascript"],
    },
    { command: "vscode-json-languageserver", args: ["--stdio"], languages: ["json"] },
    { command: "pyright-langserver", args: ["--stdio"], languages: ["python"] },
    { command: "gopls", args: ["serve"], languages: ["go"] },
    { command: "rust-analyzer", args: [], languages: ["rust"] },
    { command: "clangd", args: [], languages: ["c", "cpp"] },
  ];

  for (const candidate of candidates) {
    try {
      await execa("which", [candidate.command], { timeout: 3000 });
      servers.push(candidate);
    } catch {
      // Language server not installed
    }
  }

  logger.info("Detected language servers", {
    count: servers.length,
    languages: servers.flatMap((s) => s.languages),
  });
  return servers;
};

/**
 * Placeholder for LSP operations exposed as agent tools.
 * Full implementation requires a JSON-RPC version-two client with stdio transport.
 */
export interface LSPToolOperations {
  goToDefinition(file: string, line: number, column: number): Promise<LSPSymbol | null>;
  findReferences(file: string, line: number, column: number): Promise<LSPSymbol[]>;
  hover(file: string, line: number, column: number): Promise<LSPHoverResult | null>;
  documentSymbols(file: string): Promise<LSPSymbol[]>;
  workspaceSymbols(query: string): Promise<LSPSymbol[]>;
}

/**
 * Create a stub LSP tool that returns helpful error messages
 * when the full LSP client is not available.
 */
export const createLSPStub = (): LSPToolOperations => ({
  goToDefinition: async () => {
    logger.warn("LSP goToDefinition not available - no language server connected");
    return null;
  },
  findReferences: async () => {
    logger.warn("LSP findReferences not available - no language server connected");
    return [];
  },
  hover: async () => {
    logger.warn("LSP hover not available - no language server connected");
    return null;
  },
  documentSymbols: async () => {
    logger.warn("LSP documentSymbols not available - no language server connected");
    return [];
  },
  workspaceSymbols: async () => {
    logger.warn("LSP workspaceSymbols not available - no language server connected");
    return [];
  },
});
