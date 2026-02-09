import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createElement } from "react";

import { App } from "@/ui/components/App";
import { EnvManager } from "@/utils/env/env.utils";

EnvManager.bootstrap();

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
});

createRoot(renderer).render(createElement(App));
