import { COLOR } from "@/constants/colors";
import { type ReactNode, memo } from "react";

export const AsciiBanner = memo(function AsciiBanner(): ReactNode {
  return (
    <box flexDirection="column" paddingTop={1} paddingBottom={1}>
      <ascii-font text="TOADSTOOL" font="tiny" color={COLOR.GREEN} />
    </box>
  );
});

AsciiBanner.displayName = "AsciiBanner";
