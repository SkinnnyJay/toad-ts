import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createElement } from "react";

import { PERFORMANCE_MARK } from "@/constants/performance-marks";
import { App } from "@/ui/components/App";
import { EnvManager } from "@/utils/env/env.utils";

EnvManager.bootstrap();

performance.mark(PERFORMANCE_MARK.STARTUP_START);

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
});

createRoot(renderer).render(createElement(App));
