import { App } from "@/ui/components/App";
import { EnvManager } from "@/utils/env/env.utils";
import { render } from "ink";
import React from "react";

EnvManager.bootstrap();

console.clear();

const { unmount } = render(React.createElement(App));

process.on("SIGINT", () => {
  unmount();
  process.exit(0);
});
