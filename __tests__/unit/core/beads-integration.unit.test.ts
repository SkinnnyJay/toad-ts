import { TIMEOUT } from "@/config/timeouts";
import {
  beadsExportTasks,
  beadsImportTasks,
  beadsPrime,
  beadsSync,
  createBeadsHooks,
  isBeadsInstalled,
} from "@/core/beads-integration";
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

describe("beads-integration", () => {
  beforeEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
  });

  it("detects beads installation with discovery timeout", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({ stdout: "/usr/bin/bd", stderr: "", exitCode: 0 });

    await expect(isBeadsInstalled()).resolves.toBe(true);
    expect(execaMock).toHaveBeenCalledWith("which", ["bd"], {
      timeout: TIMEOUT.COMMAND_DISCOVERY_MS,
    });
  });

  it("returns false when beads is unavailable", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockRejectedValue(new Error("not installed"));

    await expect(isBeadsInstalled()).resolves.toBe(false);
  });

  it("runs prime and sync with configured command timeout", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({ stdout: "ok", stderr: "", exitCode: 0 });

    await expect(beadsPrime("/workspace")).resolves.toBe("ok");
    await expect(beadsSync("/workspace")).resolves.toBe("ok");

    const callsWithTimeout = execaMock.mock.calls.filter(
      (call) => (call[2] as { timeout?: number } | undefined)?.timeout === TIMEOUT.BEADS_COMMAND_MS
    );
    expect(callsWithTimeout.length).toBeGreaterThanOrEqual(2);
  });

  it("returns fallback values when commands fail", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockRejectedValue(new Error("boom"));

    await expect(beadsPrime()).resolves.toContain("bd prime failed");
    await expect(beadsSync()).resolves.toContain("bd sync failed");
    await expect(beadsImportTasks()).resolves.toEqual([]);
    await expect(
      beadsExportTasks([
        {
          title: "Task",
          status: "pending",
        },
      ])
    ).resolves.toBe(false);
  });

  it("creates default beads hooks", () => {
    expect(createBeadsHooks()).toEqual({
      SessionStart: [
        {
          matcher: "*",
          hooks: [{ type: "command", command: "bd prime" }],
        },
      ],
      PreCompact: [
        {
          matcher: "*",
          hooks: [{ type: "command", command: "bd sync" }],
        },
      ],
    });
  });
});
