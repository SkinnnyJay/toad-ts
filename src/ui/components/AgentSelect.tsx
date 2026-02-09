import { COLOR } from "@/constants/colors";
import type { AgentId } from "@/types/domain";
import { Box, Text, useInput, useStdout } from "ink";
import { useEffect, useMemo, useState } from "react";

export interface AgentOption {
  id: AgentId;
  name: string;
  description?: string;
  status?: "ready" | "loading" | "error";
}

interface AgentSelectProps {
  agents: AgentOption[];
  onSelect: (agent: AgentOption) => void;
}

export function AgentSelect({ agents, onSelect }: AgentSelectProps): JSX.Element {
  const { stdout } = useStdout();
  const [index, setIndex] = useState(0);

  const columns = stdout?.columns ?? 80;
  const cols = useMemo(() => Math.max(1, Math.min(3, Math.floor(columns / 26))), [columns]);
  const cardWidth = useMemo(() => Math.max(18, Math.floor(columns / cols) - 6), [columns, cols]);

  useInput((input, key) => {
    if (agents.length === 0) return;

    if (key.upArrow || input === "k") {
      setIndex((prev) => (prev - cols + agents.length) % agents.length);
      return;
    }
    if (key.downArrow || input === "j") {
      setIndex((prev) => (prev + cols) % agents.length);
      return;
    }
    if (key.leftArrow || input === "h") {
      setIndex((prev) => (prev - 1 + agents.length) % agents.length);
      return;
    }
    if (key.rightArrow || input === "l") {
      setIndex((prev) => (prev + 1) % agents.length);
      return;
    }

    if (/^[1-9]$/.test(input)) {
      const num = Number(input) - 1;
      if (num >= 0 && num < agents.length) {
        const candidate = agents[num];
        if (candidate) {
          setIndex(num);
          onSelect(candidate);
        }
      }
      return;
    }
    if (key.return) {
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
    return <Text dimColor>No agents available</Text>;
  }

  const statusIcon = (status?: AgentOption["status"]): { icon: string; color?: string } => {
    switch (status) {
      case "ready":
        return { icon: "●", color: COLOR.GREEN };
      case "loading":
        return { icon: "…", color: COLOR.CYAN };
      case "error":
        return { icon: "!", color: COLOR.RED };
      default:
        return { icon: "○", color: COLOR.GRAY };
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Pick an agent (1-9 quick-select):</Text>
      <Box flexDirection="column" gap={1}>
        {rows.map((row, rowIdx) => (
          <Box key={row.map((a) => a.id).join("|") || `row-${rowIdx}`} flexDirection="row" gap={2}>
            {row.map((agent, colIdx) => {
              const idx = rowIdx * 3 + colIdx;
              const selected = idx === index;
              const { icon, color } = statusIcon(agent.status);
              return (
                <Box
                  key={agent.id}
                  borderStyle="single"
                  borderColor={selected ? COLOR.CYAN : COLOR.GRAY}
                  paddingX={1}
                  paddingY={0}
                  width={cardWidth}
                  flexDirection="column"
                  gap={0}
                >
                  <Text>
                    <Text color={COLOR.YELLOW}>{idx + 1}.</Text> {agent.name}
                  </Text>
                  <Text color={color}>
                    {icon} {agent.status ?? "unknown"}
                  </Text>
                  {agent.description ? (
                    <Text dimColor wrap="wrap">
                      {agent.description}
                    </Text>
                  ) : null}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
