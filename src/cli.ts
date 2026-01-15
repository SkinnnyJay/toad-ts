import { App } from "@/ui/components/App";
import { render } from "ink";
import React from "react";

const { unmount } = render(React.createElement(App));

process.on("SIGINT", () => {
  unmount();
  process.exit(0);
});
