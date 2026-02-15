import { TIMEOUT } from "@/config/timeouts";
import { formatFile } from "@/core/code-formatter";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

describe("code-formatter", () => {
  beforeEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
  });

  it("returns not formatted when file has no extension", async () => {
    await expect(formatFile("README", {})).resolves.toEqual({ formatted: false });
  });

  it("runs formatter command with configured timeout", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });

    const result = await formatFile("src/test.ts", {
      biome: {
        extensions: [".ts"],
        command: ["biome", "format", "$FILE"],
      },
    });

    expect(result).toEqual({ formatted: true });
    expect(execaMock).toHaveBeenCalledWith("biome", ["format", "src/test.ts"], {
      timeout: TIMEOUT.FORMATTER_COMMAND_MS,
    });
  });

  it("returns formatted false with error when formatter command fails", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockRejectedValue(new Error("formatter failed"));

    const result = await formatFile("src/test.ts", {
      biome: {
        extensions: [".ts"],
        command: ["biome", "format", "$FILE"],
      },
    });

    expect(result.formatted).toBe(false);
    expect(result.error).toContain("formatter failed");
  });
});
