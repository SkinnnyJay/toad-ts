import { LIMIT } from "@/config/limits";
import { COLOR } from "@/constants/colors";
import { TextAttributes } from "@opentui/core";
import type { PropsWithChildren, ReactNode } from "react";

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
}: PropsWithChildren<AccordionSectionProps>): ReactNode {
  const indicator = isCollapsed ? "▶" : "▼";

  return (
    <box flexDirection="column" marginBottom={1} gap={0}>
      {shortcutHint ? (
        <box
          flexDirection="row"
          justifyContent="flex-end"
          marginBottom={0}
          width="100%"
          height={1}
          minHeight={1}
        >
          <text fg={COLOR.GRAY} attributes={TextAttributes.DIM}>
            {shortcutHint}
          </text>
        </box>
      ) : null}
      <box
        flexDirection="column"
        border={true}
        borderStyle="single"
        borderColor={COLOR.GRAY}
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={0}
        gap={0}
        width="100%"
        minHeight={LIMIT.ACCORDION_MIN_HEIGHT}
        height={height}
      >
        <box
          justifyContent="flex-start"
          alignItems="center"
          paddingLeft={0}
          paddingRight={0}
          paddingTop={0}
          paddingBottom={0}
          width="100%"
          height={1}
          minHeight={1}
        >
          <text attributes={TextAttributes.BOLD}>
            {indicator} {title}
          </text>
        </box>
        {!isCollapsed ? (
          <box
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
          </box>
        ) : null}
      </box>
    </box>
  );
}
