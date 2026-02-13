import { LIMIT } from "@/config/limits";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { RENDER_STAGE } from "@/constants/render-stage";
import type { AgentId } from "@/types/domain";
import { useTerminalDimensions } from "@/ui/hooks/useTerminalDimensions";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

export interface AgentOption {
  id: AgentId;
  name: string;
  description?: string;
  status?: typeof RENDER_STAGE.READY | typeof RENDER_STAGE.LOADING | typeof RENDER_STAGE.ERROR;
}

interface AgentSelectProps {
  agents: AgentOption[];
  onSelect: (agent: AgentOption) => void;
  selectedId?: AgentId;
  onCancel?: () => void;
}

export function AgentSelect({
  agents,
  onSelect,
  selectedId,
  onCancel,
}: AgentSelectProps): ReactNode {
  const terminal = useTerminalDimensions();
  const [index, setIndex] = useState(0);

  const columns = terminal.columns ?? UI.TERMINAL_DEFAULT_COLUMNS;
  const cols = useMemo(() => Math.max(1, Math.min(3, Math.floor(columns / 26))), [columns]);
  const cardWidth = useMemo(() => Math.max(18, Math.floor(columns / cols) - 6), [columns, cols]);

  useKeyboard((key) => {
    if (agents.length === 0) return;

    if (key.name === KEY_NAME.UP || key.name === KEY_NAME.K) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - cols + agents.length) % agents.length);
      return;
    }
    if (key.name === KEY_NAME.DOWN || key.name === KEY_NAME.J) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + cols) % agents.length);
      return;
    }
    if (key.name === KEY_NAME.LEFT || key.name === KEY_NAME.H) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - 1 + agents.length) % agents.length);
      return;
    }
    if (key.name === KEY_NAME.RIGHT || key.name === KEY_NAME.L) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + 1) % agents.length);
      return;
    }

    if (/^[1-9]$/.test(key.name)) {
      const num = Number(key.name) - 1;
      if (num >= 0 && num < agents.length) {
        const candidate = agents[num];
        if (candidate) {
          setIndex(num);
          onSelect(candidate);
        }
      }
      return;
    }
    if (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) {
      key.preventDefault();
      key.stopPropagation();
      const selected = agents[index];
      if (selected) onSelect(selected);
      return;
    }
    if (key.name === KEY_NAME.ESCAPE && onCancel) {
      key.preventDefault();
      key.stopPropagation();
      onCancel();
    }
  });

  useEffect(() => {
    if (index >= agents.length) {
      setIndex(0);
    }
  }, [agents.length, index]);

  useEffect(() => {
    if (!selectedId) return;
    const selectedIndex = agents.findIndex((agent) => agent.id === selectedId);
    if (selectedIndex >= 0) {
      setIndex(selectedIndex);
    }
  }, [agents, selectedId]);

  const rows = useMemo(() => {
    const chunked: AgentOption[][] = [];
    for (let i = 0; i < agents.length; i += cols) {
      chunked.push(agents.slice(i, i + cols));
    }
    return chunked;
  }, [agents, cols]);

  if (agents.length === 0) {
    return <text attributes={TextAttributes.DIM}>No agents available</text>;
  }

  const statusIcon = (status?: AgentOption["status"]): { icon: string; color?: string } => {
    switch (status) {
      case RENDER_STAGE.READY:
        return { icon: "●", color: COLOR.GREEN };
      case RENDER_STAGE.LOADING:
        return { icon: "…", color: COLOR.CYAN };
      case RENDER_STAGE.ERROR:
        return { icon: "!", color: COLOR.RED };
      default:
        return { icon: "○", color: COLOR.GRAY };
    }
  };

  return (
    <box flexDirection="column" gap={1}>
      <text>{`Pick an agent (1-${LIMIT.AGENT_SELECT_MAX_SHORTCUT} quick-select):`}</text>
      <box flexDirection="column" gap={1}>
        {rows.map((row, rowIdx) => (
          <box
            key={row.map((a) => a.id).join("|") || `row-${rowIdx}`}
            flexDirection="row"
            gap={UI.SIDEBAR_PADDING}
          >
            {row.map((agent, colIdx) => {
              const idx = rowIdx * cols + colIdx;
              const selected = idx === index;
              const { icon, color } = statusIcon(agent.status);
              return (
                <box
                  key={agent.id}
                  border={true}
                  borderStyle="single"
                  borderColor={selected ? COLOR.CYAN : COLOR.GRAY}
                  paddingLeft={1}
                  paddingRight={1}
                  paddingTop={0}
                  paddingBottom={0}
                  width={cardWidth}
                  flexDirection="column"
                  gap={0}
                >
                  <text>
                    <span fg={COLOR.YELLOW}>{idx + 1}.</span> {agent.name}
                  </text>
                  <text fg={color}>
                    {icon} {agent.status ?? "unknown"}
                  </text>
                  {agent.description ? (
                    <text attributes={TextAttributes.DIM} wrapMode="word">
                      {agent.description}
                    </text>
                  ) : null}
                </box>
              );
            })}
          </box>
        ))}
      </box>
    </box>
  );
}
