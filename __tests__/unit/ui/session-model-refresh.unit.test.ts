import {
  resolveSessionModelOptions,
  toSessionModelOptionsFromCloudResponse,
  toSessionModelOptionsFromCommandResult,
} from "@/ui/utils/session-model-refresh";
import { describe, expect, it, vi } from "vitest";

describe("session-model-refresh", () => {
  it("maps command result models and default model id", () => {
    const options = toSessionModelOptionsFromCommandResult({
      stdout: "auto - Auto (default)\nfast - Fast Model",
      stderr: "",
      exitCode: 0,
    });

    expect(options).toEqual({
      availableModels: [
        { modelId: "auto", name: "Auto" },
        { modelId: "fast", name: "Fast Model" },
      ],
      defaultModelId: "auto",
    });
  });

  it("maps cloud model response and falls back to model id for name", () => {
    const options = toSessionModelOptionsFromCloudResponse({
      models: [{ id: "auto", name: "Auto", default: true }, { id: "fallback-name-missing" }],
    });

    expect(options).toEqual({
      availableModels: [
        { modelId: "auto", name: "Auto" },
        { modelId: "fallback-name-missing", name: "fallback-name-missing" },
      ],
      defaultModelId: "auto",
    });
  });

  it("falls back to cloud listing when command listing fails", async () => {
    const runCommand = vi.fn(async () => {
      throw new Error("requires tty");
    });
    const runCloud = vi.fn(async () => ({
      models: [{ id: "auto", name: "Auto", default: true }],
    }));

    const options = await resolveSessionModelOptions({
      runCommand,
      runCloud,
    });

    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCloud).toHaveBeenCalledTimes(1);
    expect(options).toEqual({
      availableModels: [{ modelId: "auto", name: "Auto" }],
      defaultModelId: "auto",
    });
  });

  it("surfaces combined errors when all listing strategies fail", async () => {
    await expect(
      resolveSessionModelOptions({
        runCommand: async () => {
          throw new Error("command failure");
        },
        runCloud: async () => {
          throw new Error("cloud failure");
        },
      })
    ).rejects.toThrow("Model listing failed: command failure | cloud failure");
  });

  it("surfaces combined object/string errors when all listing strategies fail", async () => {
    await expect(
      resolveSessionModelOptions({
        runCommand: async () => {
          throw { message: "command object failure" };
        },
        runCloud: async () => {
          throw "cloud string failure";
        },
      })
    ).rejects.toThrow("Model listing failed: command object failure | cloud string failure");
  });
});
