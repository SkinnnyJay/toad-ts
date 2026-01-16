import { COLOR } from "@/constants/colors";
import { Box, Text } from "ink";

export interface StatusFooterProps {
  taskProgress?: { completed: number; total: number };
}

const shortcuts = [
  { key: "^C", label: "Exit" },
  { key: "^P", label: "Commands" },
  { key: "Tab", label: "Focus" },
  { key: "F1", label: "Help" },
];

export function StatusFooter({ taskProgress }: StatusFooterProps): JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={COLOR.GRAY} paddingX={1}>
      <Box flexDirection="row" gap={2} flexWrap="wrap">
        {shortcuts.map((sc) => (
          <Text key={sc.key}>
            <Text bold color={COLOR.CYAN}>
              {sc.key}
            </Text>{" "}
            {sc.label}
          </Text>
        ))}
      </Box>
      {taskProgress ? (
        <Box gap={2} borderTop borderColor={COLOR.GRAY} paddingTop={0}>
          <Text>
            Tasks: {taskProgress.completed}/{taskProgress.total}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
