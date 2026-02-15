import { TIMEOUT } from "@/config/timeouts";
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
    expect(execaMock).toHaveBeenCalledWith(
      "gh",
      ["pr", "view", "--json", "number,title,url,state,reviewDecision,isDraft"],
      { cwd: "/workspace", timeout: TIMEOUT.GH_CLI_MS }
    );
  });

  it("trims and normalizes padded gh pr view state fields", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: JSON.stringify({
        number: 7,
        title: "Padded status",
        url: "https://example.com/pr/7",
        state: " merged ",
        reviewDecision: " review_required ",
        isDraft: false,
      }),
      stderr: "",
      exitCode: 0,
    });

    const status = await getPRStatus("/workspace");

    expect(status).toEqual({
      number: 7,
      title: "Padded status",
      url: "https://example.com/pr/7",
      state: "merged",
      reviewDecision: PR_REVIEW_STATUS.REVIEW_REQUIRED,
      isDraft: false,
    });
  });

  it("falls back to unknown review decision for unsupported values", async () => {
    const execaMock = await getExecaMock();
    execaMock.mockResolvedValue({
      stdout: JSON.stringify({
        number: 8,
        title: "Unsupported review decision",
        url: "https://example.com/pr/8",
        state: "open",
        reviewDecision: "escalated",
        isDraft: false,
      }),
      stderr: "",
      exitCode: 0,
    });

    const status = await getPRStatus("/workspace");

    expect(status?.reviewDecision).toBe(PR_REVIEW_STATUS.UNKNOWN);
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
    expect(execaMock).toHaveBeenCalledWith(
      "gh",
      ["pr", "view", "--json", "number,title,url,state,reviewDecision,isDraft"],
      { cwd: process.cwd(), timeout: TIMEOUT.GH_CLI_MS }
    );
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
