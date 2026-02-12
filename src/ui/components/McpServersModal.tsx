import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { KEYBOARD_INPUT } from "@/constants/keyboard-input";
import { type McpServerListItem, formatMcpToolPreview } from "@/ui/utils/mcp-server-list";
import type { SelectOption } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

const MCP_SERVERS_MODAL_MESSAGE = {
  ENABLE_UNAVAILABLE: "Enable MCP server action is not available.",
  DISABLE_UNAVAILABLE: "Disable MCP server action is not available.",
  REFRESH_UNAVAILABLE: "Refresh MCP server list is not available.",
  EMPTY: "No MCP servers available.",
} as const;

interface McpServersModalProps {
  isOpen: boolean;
  servers: McpServerListItem[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRefresh?: () => Promise<void> | void;
  onEnableServer?: (serverId: string) => Promise<void> | void;
  onDisableServer?: (serverId: string) => Promise<void> | void;
  onListServerTools?: (serverId: string) => Promise<string[]>;
}

export function McpServersModal({
  isOpen,
  servers,
  loading = false,
  error = null,
  onClose,
  onRefresh,
  onEnableServer,
  onDisableServer,
  onListServerTools,
}: McpServersModalProps): ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const options = useMemo<SelectOption[]>(() => {
    return servers.map((server) => {
      return {
        name: server.id,
        description: `${server.status}${server.enabled === null ? "" : server.enabled ? " (enabled)" : " (disabled)"}`,
        value: server.id,
      };
    });
  }, [servers]);

  useEffect(() => {
    if (selectedIndex >= servers.length) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, servers.length]);

  const runAction = async (
    action: () => Promise<void> | void,
    unavailableMessage: string
  ): Promise<void> => {
    if (!action) {
      setStatusMessage(unavailableMessage);
      return;
    }
    setIsBusy(true);
    try {
      await action();
    } catch (actionError) {
      setStatusMessage(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setIsBusy(false);
    }
  };

  useKeyboard((key) => {
    if (!isOpen) {
      return;
    }
    if (key.name === KEY_NAME.ESCAPE || (key.ctrl && key.name === KEYBOARD_INPUT.SKIP_LOWER)) {
      key.preventDefault();
      key.stopPropagation();
      onClose();
      return;
    }
    if (servers.length === 0 || isBusy) {
      return;
    }
    const selectedServer = servers[selectedIndex];
    if (!selectedServer) {
      return;
    }
    if (key.ctrl && key.name === KEY_NAME.R) {
      key.preventDefault();
      key.stopPropagation();
      void runAction(async () => {
        if (!onRefresh) {
          throw new Error(MCP_SERVERS_MODAL_MESSAGE.REFRESH_UNAVAILABLE);
        }
        setStatusMessage("Refreshing MCP servers…");
        await onRefresh();
        setStatusMessage("MCP servers refreshed.");
      }, MCP_SERVERS_MODAL_MESSAGE.REFRESH_UNAVAILABLE);
      return;
    }
    if (key.ctrl && key.name === KEY_NAME.E) {
      key.preventDefault();
      key.stopPropagation();
      void runAction(async () => {
        if (!onEnableServer) {
          throw new Error(MCP_SERVERS_MODAL_MESSAGE.ENABLE_UNAVAILABLE);
        }
        setStatusMessage(`Enabling MCP server ${selectedServer.id}…`);
        await onEnableServer(selectedServer.id);
        setStatusMessage(`Enabled MCP server ${selectedServer.id}.`);
      }, MCP_SERVERS_MODAL_MESSAGE.ENABLE_UNAVAILABLE);
      return;
    }
    if (key.ctrl && key.name === KEY_NAME.D) {
      key.preventDefault();
      key.stopPropagation();
      void runAction(async () => {
        if (!onDisableServer) {
          throw new Error(MCP_SERVERS_MODAL_MESSAGE.DISABLE_UNAVAILABLE);
        }
        setStatusMessage(`Disabling MCP server ${selectedServer.id}…`);
        await onDisableServer(selectedServer.id);
        setStatusMessage(`Disabled MCP server ${selectedServer.id}.`);
      }, MCP_SERVERS_MODAL_MESSAGE.DISABLE_UNAVAILABLE);
      return;
    }
    if (key.ctrl && key.name === KEY_NAME.T) {
      key.preventDefault();
      key.stopPropagation();
      if (!onListServerTools) {
        setStatusMessage("MCP tool list action is not available.");
        return;
      }
      void runAction(async () => {
        setStatusMessage(`Fetching tools for ${selectedServer.id}…`);
        const tools = await onListServerTools(selectedServer.id);
        if (tools.length === 0) {
          setStatusMessage(`No tools found for ${selectedServer.id}.`);
          return;
        }
        setStatusMessage(`Tools (${tools.length}): ${formatMcpToolPreview(tools)}`);
      }, "MCP tool list action is not available.");
    }
  });

  if (!isOpen) {
    return null;
  }

  return (
    <box
      flexDirection="column"
      border={true}
      borderStyle="double"
      borderColor={COLOR.CYAN}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
      minHeight={UI.POPUP_HEIGHT}
      width={UI.POPUP_WIDTH}
    >
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={COLOR.CYAN} attributes={TextAttributes.BOLD}>
          MCP Servers (Esc/Ctrl+S to close)
        </text>
        <text attributes={TextAttributes.DIM}>
          {servers.length} server{servers.length === 1 ? "" : "s"}
        </text>
      </box>
      {loading ? <text attributes={TextAttributes.DIM}>Loading MCP servers…</text> : null}
      {error ? <text fg={COLOR.YELLOW}>{error}</text> : null}
      {servers.length === 0 ? (
        <text attributes={TextAttributes.DIM}>{MCP_SERVERS_MODAL_MESSAGE.EMPTY}</text>
      ) : (
        <select
          options={options}
          selectedIndex={selectedIndex}
          focused={true}
          onChange={(index) => setSelectedIndex(index)}
          style={UI.FULL_WIDTH_STYLE}
        />
      )}
      {statusMessage ? (
        <box marginTop={1}>
          <text fg={COLOR.GRAY}>{statusMessage}</text>
        </box>
      ) : null}
      <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
        <text attributes={TextAttributes.DIM}>
          ↑/↓ select | Ctrl+E enable | Ctrl+D disable | Ctrl+T tools | Ctrl+R refresh
        </text>
      </box>
    </box>
  );
}
