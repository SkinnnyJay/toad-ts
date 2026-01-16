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
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={COLOR.GRAY}
      marginBottom={1}
      paddingX={1}
      paddingY={0}
      gap={0}
    >
      <Box justifyContent="space-between" alignItems="center">
        <Text bold>
          {indicator} {title}
        </Text>
        {shortcutHint ? <Text dimColor>{shortcutHint}</Text> : null}
      </Box>
      {!isCollapsed ? <Box marginTop={0}>{children}</Box> : null}
    </Box>
  );
}
