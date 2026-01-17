import { COLOR } from "@/constants/colors";
import { Box, Text } from "ink";
import type { PropsWithChildren } from "react";

interface AccordionSectionProps {
  title: string;
  isCollapsed: boolean;
  shortcutHint?: string;
}

export function AccordionSection({
  title,
  isCollapsed,
  shortcutHint,
  children,
}: PropsWithChildren<AccordionSectionProps>): JSX.Element {
  const indicator = isCollapsed ? "▶" : "▼";

  return (
    <Box flexDirection="column" marginBottom={1} gap={0}>
      {shortcutHint ? (
        <Box flexDirection="row" justifyContent="flex-end" marginBottom={0}>
          <Text dimColor color={COLOR.GRAY}>
            {shortcutHint}
          </Text>
        </Box>
      ) : null}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={COLOR.GRAY}
        paddingX={1}
        paddingY={0}
        gap={0}
      >
        <Box justifyContent="space-between" alignItems="center">
          <Text bold>
            {indicator} {title}
          </Text>
        </Box>
        {!isCollapsed ? (
          <Box marginTop={0} overflow="hidden" minHeight={0}>
            {children}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
