import { COLOR } from "@/constants/colors";
import { memo } from "react";

export const AsciiBanner = memo(function AsciiBanner(): JSX.Element {
  return (
    <box flexDirection="column" paddingY={1}>
      <ascii-font text="TOADSTOOL" font="tiny" color={COLOR.GREEN} />
    </box>
  );
});

AsciiBanner.displayName = "AsciiBanner";
