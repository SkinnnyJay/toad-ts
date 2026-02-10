import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createElement } from "react";

import { PERFORMANCE_MARK } from "@/constants/performance-marks";
import { SERVER_FLAG } from "@/constants/server-cli";
import { startHeadlessServer } from "@/server/headless-server";
import { resolveServerConfig } from "@/server/server-config";
import { App } from "@/ui/components/App";
import { EnvManager } from "@/utils/env/env.utils";

EnvManager.bootstrap();

performance.mark(PERFORMANCE_MARK.STARTUP_START);

const args = process.argv.slice(2);

if (args.includes(SERVER_FLAG)) {
  const config = resolveServerConfig(args);
  await startHeadlessServer(config);
} else {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });
  createRoot(renderer).render(createElement(App));
}
