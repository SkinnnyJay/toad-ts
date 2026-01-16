import { COLOR } from "@/constants/colors";
import type { AgentId } from "@/types/domain";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";

export interface AgentOption {
  id: AgentId;
  name: string;
  description?: string;
}

interface AgentSelectProps {
  agents: AgentOption[];
  onSelect: (agent: AgentOption) => void;
}

export function AgentSelect({ agents, onSelect }: AgentSelectProps): JSX.Element {
  const [index, setIndex] = useState(0);

  useInput((_input, key) => {
    if (agents.length === 0) return;
    if (key.upArrow) setIndex((prev) => (prev - 1 + agents.length) % agents.length);
    if (key.downArrow) setIndex((prev) => (prev + 1) % agents.length);
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

  if (agents.length === 0) {
    return <Text dimColor>No agents available</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text>Select an agent:</Text>
      {agents.map((agent, i) => (
        <Text key={agent.id} color={i === index ? COLOR.GREEN : undefined}>
          {i === index ? "› " : "  "}
          {agent.name}
          {agent.description ? ` — ${agent.description}` : ""}
        </Text>
      ))}
    </Box>
  );
}
