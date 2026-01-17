import { COLOR } from "@/constants/colors";
import { getDefaultProvider, setDefaultProvider } from "@/store/settings/settings-manager";
import type { AgentId } from "@/types/domain";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { Box, Text, useInput } from "ink";
import { useCallback, useEffect, useMemo, useState } from "react";

interface DefaultProviderTabProps {
  agents: AgentOption[];
  onSave?: () => void;
}

export function DefaultProviderTab({ agents, onSave }: DefaultProviderTabProps): JSX.Element {
  const [index, setIndex] = useState(0);
  const [currentDefault, setCurrentDefault] = useState<AgentId | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const options = useMemo(
    () => [{ id: undefined as AgentId | undefined, name: "None" }, ...agents],
    [agents]
  );

  // Load current default provider
  useEffect(() => {
    void (async () => {
      try {
        const defaultProvider = await getDefaultProvider();
        if (defaultProvider?.agentId) {
          setCurrentDefault(defaultProvider.agentId);
          // Find index of current default in agents list
          const foundIndex = agents.findIndex((a) => a.id === defaultProvider.agentId);
          if (foundIndex >= 0) {
            setIndex(foundIndex + 1); // +1 for "None" option
          }
        } else {
          setIndex(0); // "None" option
        }
      } catch (error) {
        // Ignore errors, use default
      } finally {
        setIsLoading(false);
      }
    })();
  }, [agents]);

  const handleSelect = useCallback(
    async (agentId: AgentId | undefined) => {
      try {
        await setDefaultProvider(agentId);
        setCurrentDefault(agentId);
        onSave?.();
      } catch (error) {
        // Error handling - could show message to user
      }
    },
    [onSave]
  );

  useInput((_input, key) => {
    if (isLoading) return;
    if (options.length === 0) return;

    if (key.upArrow) {
      setIndex((prev) => (prev - 1 + options.length) % options.length);
    }
    if (key.downArrow) {
      setIndex((prev) => (prev + 1) % options.length);
    }
    if (key.return) {
      const selected = options[index];
      if (selected) {
        void handleSelect(selected.id);
      }
    }
  });

  useEffect(() => {
    if (index >= options.length) {
      setIndex(0);
    }
  }, [index, options.length]);

  if (isLoading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text dimColor>Loading settings…</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingY={1}>
      <Text bold>Default Provider</Text>
      <Text dimColor>Select a default agent to use when starting the app.</Text>
      <Text dimColor>Press Enter to select, ↑/↓ to navigate.</Text>
      <Box flexDirection="column" gap={0} marginTop={1}>
        {options.map((option, i) => {
          const isSelected = i === index;
          const isCurrentDefault = option.id === currentDefault;
          const displayName = option.id ? option.name : "None (show agent selection)";

          return (
            <Box key={option.id ?? "none"} flexDirection="row" paddingX={1} paddingY={0}>
              <Text color={isSelected ? COLOR.GREEN : isCurrentDefault ? COLOR.CYAN : undefined}>
                {isSelected ? "› " : "  "}
                {isCurrentDefault && !isSelected ? "● " : "  "}
                {displayName}
              </Text>
            </Box>
          );
        })}
      </Box>
      {currentDefault && (
        <Box marginTop={1} paddingTop={1} borderStyle="single" borderTop={true}>
          <Text dimColor>Current default: {agents.find((a) => a.id === currentDefault)?.name}</Text>
        </Box>
      )}
    </Box>
  );
}
