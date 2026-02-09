import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
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
}

export function AgentSelect({ agents, onSelect }: AgentSelectProps): ReactNode {
  const terminal = useTerminalDimensions();
  const [index, setIndex] = useState(0);

  const columns = terminal.columns ?? UI.TERMINAL_DEFAULT_COLUMNS;
  const cols = useMemo(() => Math.max(1, Math.min(3, Math.floor(columns / 26))), [columns]);
  const cardWidth = useMemo(() => Math.max(18, Math.floor(columns / cols) - 6), [columns, cols]);

  useKeyboard((key) => {
    if (agents.length === 0) return;

    if (key.name === "up" || key.name === "k") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - cols + agents.length) % agents.length);
      return;
    }
    if (key.name === "down" || key.name === "j") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + cols) % agents.length);
      return;
    }
    if (key.name === "left" || key.name === "h") {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - 1 + agents.length) % agents.length);
      return;
    }
    if (key.name === "right" || key.name === "l") {
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
    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      key.stopPropagation();
      const selected = agents[index];
      if (selected) onSelect(selected);
    }
  });

  useEffect(() => {
    if (index >= agents.length) {
      setIndex(0);
    }
  }, [agents.length, index]);

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
      <text>Pick an agent (1-9 quick-select):</text>
      <box flexDirection="column" gap={1}>
        {rows.map((row, rowIdx) => (
          <box key={row.map((a) => a.id).join("|") || `row-${rowIdx}`} flexDirection="row" gap={2}>
            {row.map((agent, colIdx) => {
              const idx = rowIdx * 3 + colIdx;
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
