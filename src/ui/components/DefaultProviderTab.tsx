import { COLOR } from "@/constants/colors";
import { KEY_NAME } from "@/constants/key-names";
import { getDefaultProvider, setDefaultProvider } from "@/store/settings/settings-manager";
import type { AgentId } from "@/types/domain";
import type { AgentOption } from "@/ui/components/AgentSelect";
import { TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

interface DefaultProviderTabProps {
  agents: AgentOption[];
  onSave?: () => void;
}

type DefaultProviderOption = {
  id?: AgentId;
  name: string;
};

export function DefaultProviderTab({ agents, onSave }: DefaultProviderTabProps): ReactNode {
  const [index, setIndex] = useState(0);
  const [currentDefault, setCurrentDefault] = useState<AgentId | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const options: DefaultProviderOption[] = useMemo(
    () => [{ id: undefined, name: "None" }, ...agents],
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

  useKeyboard((key) => {
    if (isLoading) return;
    if (options.length === 0) return;

    if (key.name === KEY_NAME.UP) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev - 1 + options.length) % options.length);
    }
    if (key.name === KEY_NAME.DOWN) {
      key.preventDefault();
      key.stopPropagation();
      setIndex((prev) => (prev + 1) % options.length);
    }
    if (key.name === KEY_NAME.RETURN || key.name === KEY_NAME.LINEFEED) {
      key.preventDefault();
      key.stopPropagation();
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
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <text attributes={TextAttributes.DIM}>Loading settings…</text>
      </box>
    );
  }

  return (
    <box flexDirection="column" gap={1} paddingTop={1} paddingBottom={1}>
      <text attributes={TextAttributes.BOLD}>Default Provider</text>
      <text attributes={TextAttributes.DIM}>
        Select a default agent to use when starting the app.
      </text>
      <text attributes={TextAttributes.DIM}>Press Enter to select, ↑/↓ to navigate.</text>
      <box flexDirection="column" gap={0} marginTop={1}>
        {options.map((option, i) => {
          const isSelected = i === index;
          const isCurrentDefault = option.id === currentDefault;
          const displayName = option.id ? option.name : "None (show agent selection)";

          return (
            <box
              key={option.id ?? "none"}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              paddingTop={0}
              paddingBottom={0}
            >
              <text fg={isSelected ? COLOR.GREEN : isCurrentDefault ? COLOR.CYAN : undefined}>
                {isSelected ? "› " : "  "}
                {isCurrentDefault && !isSelected ? "● " : "  "}
                {displayName}
              </text>
            </box>
          );
        })}
      </box>
      {currentDefault && (
        <box marginTop={1} paddingTop={1} borderStyle="single" border={["top"]}>
          <text attributes={TextAttributes.DIM}>
            Current default: {agents.find((a) => a.id === currentDefault)?.name}
          </text>
        </box>
      )}
    </box>
  );
}
