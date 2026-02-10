import { performance } from "node:perf_hooks";
import { loadAppConfig } from "@/config/app-config";
import { loadHarnessConfig } from "@/harness/harnessConfig";

const report = (label: string, durationMs: number): void => {
  process.stdout.write(`${label}: ${durationMs.toFixed(2)}ms\n`);
};

const run = async (): Promise<void> => {
  const configStart = performance.now();
  await loadAppConfig();
  const configEnd = performance.now();
  report("loadAppConfig", configEnd - configStart);

  const harnessStart = performance.now();
  await loadHarnessConfig();
  const harnessEnd = performance.now();
  report("loadHarnessConfig", harnessEnd - harnessStart);
};

void run();
