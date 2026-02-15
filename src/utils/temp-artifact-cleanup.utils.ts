import { rmSync, unlinkSync } from "node:fs";

const TEMP_ARTIFACT_KIND = {
  FILE: "file",
  DIRECTORY: "directory",
} as const;

export type TempArtifactKind = (typeof TEMP_ARTIFACT_KIND)[keyof typeof TEMP_ARTIFACT_KIND];

type TempArtifactEntry = {
  kind: TempArtifactKind;
};

const artifacts = new Map<string, TempArtifactEntry>();
let handlersRegistered = false;

const cleanupSync = (): void => {
  for (const [artifactPath, entry] of artifacts) {
    try {
      if (entry.kind === TEMP_ARTIFACT_KIND.DIRECTORY) {
        rmSync(artifactPath, { recursive: true, force: true });
      } else {
        unlinkSync(artifactPath);
      }
    } catch {
      // Ignore best-effort cleanup failures.
    }
  }
  artifacts.clear();
};

const registerProcessHandlers = (): void => {
  if (handlersRegistered) {
    return;
  }
  process.on("exit", cleanupSync);
  process.on("SIGINT", cleanupSync);
  process.on("SIGTERM", cleanupSync);
  handlersRegistered = true;
};

export const registerTempArtifact = (
  artifactPath: string,
  kind: TempArtifactKind
): (() => void) => {
  registerProcessHandlers();
  artifacts.set(artifactPath, { kind });
  return () => {
    artifacts.delete(artifactPath);
  };
};

export const runTempArtifactCleanupNowForTests = (): void => {
  cleanupSync();
};

export const resetTempArtifactRegistryForTests = (): void => {
  artifacts.clear();
};

export const TEMP_ARTIFACT_TYPE = TEMP_ARTIFACT_KIND;
