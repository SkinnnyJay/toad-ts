import { COLOR } from "@/constants/colors";
import { Box, Text } from "ink";

export interface StatusFooterProps {
  taskProgress?: { completed: number; total: number };
  focusTarget?: "chat" | "files" | "plan" | "context" | "sessions" | "agent";
}

const globalShortcuts = [
  { key: "^C", label: "Exit" },
  { key: "^P", label: "Commands" },
  { key: "Esc", label: "Back to Chat" },
];

const focusShortcuts: Record<NonNullable<StatusFooterProps["focusTarget"]>, string[]> = {
  chat: ["Enter submit", "Ctrl+Enter submit", "Ctrl+P palette"],
  files: ["Cmd+F focus", "↑/↓ navigate", "Space/Enter expand"],
  plan: ["2 toggle", "Enter select"],
  context: ["3 toggle"],
  sessions: ["4 toggle", "↑/↓ select", "Enter open"],
  agent: ["5 toggle"],
};

export function StatusFooter({
  taskProgress,
  focusTarget = "chat",
}: StatusFooterProps): JSX.Element {
  const focusHints = focusShortcuts[focusTarget] ?? [];
  return (
    <Box
      width="100%"
      flexDirection="row"
      borderStyle="single"
      borderColor={COLOR.GRAY}
      paddingX={1}
      paddingY={0}
      gap={2}
      justifyContent="space-between"
      alignItems="center"
    >
      <Box flexDirection="row" gap={2}>
        {globalShortcuts.map((sc) => (
          <Text key={sc.key}>
            <Text bold color={COLOR.CYAN}>
              {sc.key}
            </Text>{" "}
            {sc.label}
          </Text>
        ))}
      </Box>
      <Box flexDirection="row" gap={2}>
        <Text>
          <Text bold color={COLOR.YELLOW}>
            Focus:
          </Text>{" "}
          {focusTarget}
        </Text>
        {focusHints.map((hint) => (
          <Text key={hint} color={COLOR.GRAY}>
            {hint}
          </Text>
        ))}
      </Box>
      {taskProgress ? (
        <Text>
          Tasks: {taskProgress.completed}/{taskProgress.total}
        </Text>
      ) : null}
    </Box>
  );
}
