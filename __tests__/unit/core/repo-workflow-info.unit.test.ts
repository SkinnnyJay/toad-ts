import { TIMEOUT } from "@/config/timeouts";
import { PR_REVIEW_STATUS } from "@/constants/pr-review-status";
import { REPO_WORKFLOW_ACTION } from "@/constants/repo-workflow-actions";
import { REPO_WORKFLOW_STATUS } from "@/constants/repo-workflow-status";
import { getRepoWorkflowInfo } from "@/core/repo-workflow";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("execa", () => {
  return {
    execa: vi.fn(),
  };
});

vi.mock("@/core/pr-status", () => {
  return {
    getPRStatus: vi.fn(),
  };
});

vi.mock("@/store/checkpoints/checkpoint-git", () => {
  return {
    isGitClean: vi.fn(),
  };
});

const getExecaMock = async () => {
  const module = await import("execa");
  return module.execa as unknown as ReturnType<typeof vi.fn>;
};

const getPrStatusMock = async () => {
  const module = await import("@/core/pr-status");
  return module.getPRStatus as unknown as ReturnType<typeof vi.fn>;
};

const getIsGitCleanMock = async () => {
  const module = await import("@/store/checkpoints/checkpoint-git");
  return module.isGitClean as unknown as ReturnType<typeof vi.fn>;
};

const buildExecaImplementation = (
  checksPayload: Array<{ status: string; conclusion: string }>,
  remoteUrl = "https://github.com/acme/toad-ts.git"
) => {
  return async (command: string, args?: string[], options?: unknown) => {
    const key = `${command} ${(args ?? []).join(" ")}`.trim();
    if (key === "git rev-parse --show-toplevel") {
      return { stdout: "/workspace", stderr: "", exitCode: 0 };
    }
    if (key === "git rev-parse --abbrev-ref HEAD") {
      return { stdout: "feature/refactor\n", stderr: "", exitCode: 0 };
    }
    if (key === "git rev-list --count --left-right HEAD...@{u}") {
      return { stdout: "1 0\n", stderr: "", exitCode: 0 };
    }
    if (key === "git status --porcelain") {
      return { stdout: "", stderr: "", exitCode: 0 };
    }
    if (key === "git config --get remote.origin.url") {
      return { stdout: `${remoteUrl}\n`, stderr: "", exitCode: 0 };
    }
    if (key === "gh pr checks --json name,status,conclusion") {
      expect(options).toMatchObject({ timeout: TIMEOUT.GH_CLI_MS });
      return {
        stdout: JSON.stringify(checksPayload),
        stderr: "",
        exitCode: 0,
      };
    }
    throw new Error(`Unexpected command: ${key}`);
  };
};

describe("getRepoWorkflowInfo", () => {
  beforeEach(async () => {
    const execaMock = await getExecaMock();
    const prStatusMock = await getPrStatusMock();
    const isGitCleanMock = await getIsGitCleanMock();
    execaMock.mockReset();
    prStatusMock.mockReset();
    isGitCleanMock.mockReset();
  });

  it("builds workflow info from git and PR metadata", async () => {
    const execaMock = await getExecaMock();
    const prStatusMock = await getPrStatusMock();
    const isGitCleanMock = await getIsGitCleanMock();

    execaMock.mockImplementation(async (command: string, args?: string[], options?: unknown) => {
      const key = `${command} ${(args ?? []).join(" ")}`.trim();
      if (key === "git rev-parse --show-toplevel") {
        return { stdout: "/workspace", stderr: "", exitCode: 0 };
      }
      if (key === "git rev-parse --abbrev-ref HEAD") {
        return { stdout: "feature/refactor\n", stderr: "", exitCode: 0 };
      }
      if (key === "git rev-list --count --left-right HEAD...@{u}") {
        return { stdout: "2 1\n", stderr: "", exitCode: 0 };
      }
      if (key === "git status --porcelain") {
        return { stdout: "", stderr: "", exitCode: 0 };
      }
      if (key === "git config --get remote.origin.url") {
        return { stdout: "https://github.com/acme/toad-ts.git\n", stderr: "", exitCode: 0 };
      }
      if (key === "gh pr checks --json name,status,conclusion") {
        expect(options).toMatchObject({ timeout: TIMEOUT.GH_CLI_MS });
        return {
          stdout: JSON.stringify([{ name: "ci", status: "completed", conclusion: "success" }]),
          stderr: "",
          exitCode: 0,
        };
      }
      throw new Error(`Unexpected command: ${key}`);
    });

    prStatusMock.mockResolvedValue({
      number: 42,
      title: "Improve reliability",
      url: "https://github.com/acme/toad-ts/pull/42",
      state: "open",
      reviewDecision: PR_REVIEW_STATUS.APPROVED,
    });
    isGitCleanMock.mockResolvedValue(true);

    const info = await getRepoWorkflowInfo("/workspace");

    expect(info.owner).toBe("acme");
    expect(info.repoName).toBe("toad-ts");
    expect(info.branch).toBe("feature/refactor");
    expect(info.isDirty).toBe(false);
    expect(info.isAhead).toBe(true);
    expect(info.isBehind).toBe(true);
    expect(info.checksStatus).toBe("pass");
    expect(info.status).toBe(REPO_WORKFLOW_STATUS.APPROVED);
    expect(info.action).toBe(REPO_WORKFLOW_ACTION[REPO_WORKFLOW_STATUS.APPROVED]);
  });

  it("falls back when git and gh checks are unavailable", async () => {
    const execaMock = await getExecaMock();
    const prStatusMock = await getPrStatusMock();

    execaMock.mockImplementation(async (command: string, args?: string[]) => {
      const key = `${command} ${(args ?? []).join(" ")}`.trim();
      if (key === "git rev-parse --show-toplevel") {
        throw new Error("not a git repo");
      }
      if (key === "git rev-parse --abbrev-ref HEAD") {
        throw new Error("no branch");
      }
      if (key === "git rev-list --count --left-right HEAD...@{u}") {
        throw new Error("no upstream");
      }
      if (key === "git status --porcelain") {
        throw new Error("status failed");
      }
      if (key === "git config --get remote.origin.url") {
        throw new Error("no remote");
      }
      if (key === "gh pr checks --json name,status,conclusion") {
        throw new Error("gh missing");
      }
      throw new Error(`Unexpected command: ${key}`);
    });

    prStatusMock.mockResolvedValue(null);

    const info = await getRepoWorkflowInfo("/workspace/no-git");

    expect(info.owner).toBe("unknown");
    expect(info.repoName).toBe("no-git");
    expect(info.branch).toBe("unknown");
    expect(info.isDirty).toBe(false);
    expect(info.isAhead).toBe(false);
    expect(info.isBehind).toBe(false);
    expect(info.checksStatus).toBeNull();
    expect(info.status).toBe(REPO_WORKFLOW_STATUS.LOCAL_CLEAN);
    expect(info.action).toBe(REPO_WORKFLOW_ACTION[REPO_WORKFLOW_STATUS.LOCAL_CLEAN]);
  });

  it("marks workflow as CI failing when checks report failure", async () => {
    const execaMock = await getExecaMock();
    const prStatusMock = await getPrStatusMock();
    const isGitCleanMock = await getIsGitCleanMock();

    execaMock.mockImplementation(
      buildExecaImplementation([{ status: "completed", conclusion: "failure" }])
    );
    prStatusMock.mockResolvedValue({
      number: 42,
      title: "Improve reliability",
      url: "https://github.com/acme/toad-ts/pull/42",
      state: "open",
      reviewDecision: PR_REVIEW_STATUS.APPROVED,
    });
    isGitCleanMock.mockResolvedValue(true);

    const info = await getRepoWorkflowInfo("/workspace");

    expect(info.checksStatus).toBe("fail");
    expect(info.status).toBe(REPO_WORKFLOW_STATUS.CI_FAILING);
    expect(info.action).toBe(REPO_WORKFLOW_ACTION[REPO_WORKFLOW_STATUS.CI_FAILING]);
  });

  it("keeps open status when checks are pending", async () => {
    const execaMock = await getExecaMock();
    const prStatusMock = await getPrStatusMock();
    const isGitCleanMock = await getIsGitCleanMock();

    execaMock.mockImplementation(
      buildExecaImplementation([{ status: "in_progress", conclusion: "" }])
    );
    prStatusMock.mockResolvedValue({
      number: 42,
      title: "Improve reliability",
      url: "https://github.com/acme/toad-ts/pull/42",
      state: "open",
      reviewDecision: PR_REVIEW_STATUS.UNKNOWN,
    });
    isGitCleanMock.mockResolvedValue(true);

    const info = await getRepoWorkflowInfo("/workspace");

    expect(info.checksStatus).toBe("pending");
    expect(info.status).toBe(REPO_WORKFLOW_STATUS.OPEN);
    expect(info.action).toBe(REPO_WORKFLOW_ACTION[REPO_WORKFLOW_STATUS.OPEN]);
  });

  it("parses owner and repo from ssh remote url", async () => {
    const execaMock = await getExecaMock();
    const prStatusMock = await getPrStatusMock();
    const isGitCleanMock = await getIsGitCleanMock();

    execaMock.mockImplementation(
      buildExecaImplementation(
        [{ status: "completed", conclusion: "success" }],
        "git@github.com:octocat/hello-world.git"
      )
    );
    prStatusMock.mockResolvedValue({
      number: 7,
      title: "SSH remote parse",
      url: "https://github.com/octocat/hello-world/pull/7",
      state: "open",
      reviewDecision: PR_REVIEW_STATUS.APPROVED,
    });
    isGitCleanMock.mockResolvedValue(true);

    const info = await getRepoWorkflowInfo("/workspace");

    expect(info.owner).toBe("octocat");
    expect(info.repoName).toBe("hello-world");
  });

  it("parses owner and repo from ssh protocol remote url", async () => {
    const execaMock = await getExecaMock();
    const prStatusMock = await getPrStatusMock();
    const isGitCleanMock = await getIsGitCleanMock();

    execaMock.mockImplementation(
      buildExecaImplementation(
        [{ status: "completed", conclusion: "success" }],
        "ssh://git@github.com:2222/octocat/hello-world.git"
      )
    );
    prStatusMock.mockResolvedValue({
      number: 8,
      title: "SSH protocol remote parse",
      url: "https://github.com/octocat/hello-world/pull/8",
      state: "open",
      reviewDecision: PR_REVIEW_STATUS.APPROVED,
    });
    isGitCleanMock.mockResolvedValue(true);

    const info = await getRepoWorkflowInfo("/workspace");

    expect(info.owner).toBe("octocat");
    expect(info.repoName).toBe("hello-world");
  });
});
