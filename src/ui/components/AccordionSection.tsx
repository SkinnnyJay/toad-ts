import { COLOR } from "@/constants/colors";
import { Box, Text } from "ink";
import type { PropsWithChildren } from "react";

interface AccordionSectionProps {
  title: string;
  isCollapsed: boolean;
  shortcutHint?: string;
  height?: number;
}

export function AccordionSection({
  title,
  isCollapsed,
  shortcutHint,
  height,
  children,
}: PropsWithChildren<AccordionSectionProps>): JSX.Element {
  const indicator = isCollapsed ? "▶" : "▼";

  return (
    <Box flexDirection="column" marginBottom={1} gap={0}>
      {shortcutHint ? (
        <Box
          flexDirection="row"
          justifyContent="flex-end"
          marginBottom={0}
          width="100%"
          height={1}
          minHeight={1}
        >
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
        width="100%"
        minHeight={3}
        height={height}
      >
        <Box
          justifyContent="flex-start"
          alignItems="center"
          paddingX={0}
          paddingY={0}
          width="100%"
          height={1}
          minHeight={1}
        >
          <Text bold>
            {indicator} {title}
          </Text>
        </Box>
        {!isCollapsed ? (
          <Box
            marginTop={0}
            marginBottom={0}
            paddingTop={0}
            paddingBottom={0}
            overflow="hidden"
            minHeight={0}
            minWidth={0}
            width="100%"
            height={height ? height - 1 : undefined}
          >
            {children}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
