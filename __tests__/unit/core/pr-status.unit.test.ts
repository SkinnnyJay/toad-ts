import { PR_REVIEW_STATUS } from "@/constants/pr-review-status";
import { getPRStatus, prStatusColor } from "@/core/pr-status";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

describe("pr-status", () => {
  beforeEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
  });

  afterEach(async () => {
    const execaMock = await getExecaMock();
    execaMock.mockReset();
  });

  it("parses gh pr view output into normalized status", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: JSON.stringify({
        number: 42,
        title: "Improve workflow",
        url: "https://example.com/pr/42",
        state: "OPEN",
        reviewDecision: "APPROVED",
        isDraft: false,
      }),
      stderr: "",
      exitCode: 0,
    });

    const status = await getPRStatus("/workspace");

    expect(status).toEqual({
      number: 42,
      title: "Improve workflow",
      url: "https://example.com/pr/42",
      state: "open",
      reviewDecision: PR_REVIEW_STATUS.APPROVED,
      isDraft: false,
    });
  });

  it("returns null when PR number or URL is missing", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: JSON.stringify({
        title: "No number",
      }),
      stderr: "",
      exitCode: 0,
    });

    await expect(getPRStatus()).resolves.toBeNull();
  });

  it("returns null when gh command throws", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockRejectedValue(new Error("gh not installed"));

    await expect(getPRStatus()).resolves.toBeNull();
  });

  it("returns color for review status", () => {
    expect(
      prStatusColor({
        number: 1,
        title: "t",
        url: "https://example.com/pr/1",
        state: "open",
        reviewDecision: PR_REVIEW_STATUS.CHANGES_REQUESTED,
      })
    ).toBe("#FF4444");
  });
});
