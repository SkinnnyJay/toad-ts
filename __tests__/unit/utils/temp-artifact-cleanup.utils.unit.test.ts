import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  TEMP_ARTIFACT_TYPE,
  registerTempArtifact,
  resetTempArtifactRegistryForTests,
  runTempArtifactCleanupNowForTests,
} from "@/utils/temp-artifact-cleanup.utils";
import { afterEach, describe, expect, it } from "vitest";

describe("temp artifact cleanup utility", () => {
  afterEach(() => {
    resetTempArtifactRegistryForTests();
  });

  it("removes registered temp files and directories during cleanup", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "toadstool-temp-artifacts-"));
    const filePath = path.join(root, "artifact.sock");
    const dirPath = path.join(root, "editor-temp");
    const nestedFilePath = path.join(dirPath, "draft.txt");
    await writeFile(filePath, "socket");
    await mkdir(dirPath, { recursive: true });
    await writeFile(nestedFilePath, "draft");

    registerTempArtifact(filePath, TEMP_ARTIFACT_TYPE.FILE);
    registerTempArtifact(dirPath, TEMP_ARTIFACT_TYPE.DIRECTORY);
    runTempArtifactCleanupNowForTests();

    expect(existsSync(filePath)).toBe(false);
    expect(existsSync(dirPath)).toBe(false);
  });
});
