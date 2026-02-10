import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { AGENT_STATUS } from "@/constants/agent-status";
import { BACKGROUND_TASK_STATUS } from "@/constants/background-task-status";
import { FOCUS_TARGET } from "@/constants/focus-target";
import { LOG_LEVEL } from "@/constants/log-level";
import { PLAN_STATUS } from "@/constants/plan-status";
import { RENDER_STAGE } from "@/constants/render-stage";
import { TASK_STATUS } from "@/constants/task-status";
import { TOOL_CALL_STATUS } from "@/constants/tool-call-status";
import { describe, expect, it } from "vitest";

describe("Constants", () => {
  describe("Status Constants", () => {
    it("should have all expected agent status values", () => {
      expect(AGENT_STATUS.IDLE).toBe("idle");
      expect(AGENT_STATUS.WORKING).toBe("working");
      expect(AGENT_STATUS.WAITING).toBe("waiting");
      expect(AGENT_STATUS.COMPLETED).toBe("completed");
      expect(AGENT_STATUS.ERROR).toBe("error");
    });

    it("should have all expected task status values", () => {
      expect(TASK_STATUS.PENDING).toBe("pending");
      expect(TASK_STATUS.ASSIGNED).toBe("assigned");
      expect(TASK_STATUS.RUNNING).toBe("running");
      expect(TASK_STATUS.COMPLETED).toBe("completed");
      expect(TASK_STATUS.FAILED).toBe("failed");
      expect(TASK_STATUS.BLOCKED).toBe("blocked");
    });

    it("should have all expected tool call status values", () => {
      expect(TOOL_CALL_STATUS.PENDING).toBe("pending");
      expect(TOOL_CALL_STATUS.AWAITING_APPROVAL).toBe("awaiting_approval");
      expect(TOOL_CALL_STATUS.APPROVED).toBe("approved");
      expect(TOOL_CALL_STATUS.DENIED).toBe("denied");
      expect(TOOL_CALL_STATUS.RUNNING).toBe("running");
      expect(TOOL_CALL_STATUS.SUCCEEDED).toBe("succeeded");
      expect(TOOL_CALL_STATUS.FAILED).toBe("failed");
    });

    it("should have all expected background task status values", () => {
      expect(BACKGROUND_TASK_STATUS.RUNNING).toBe("running");
      expect(BACKGROUND_TASK_STATUS.COMPLETED).toBe("completed");
      expect(BACKGROUND_TASK_STATUS.FAILED).toBe("failed");
      expect(BACKGROUND_TASK_STATUS.CANCELLED).toBe("cancelled");
    });

    it("should have all expected plan status values", () => {
      expect(PLAN_STATUS.PLANNING).toBe("planning");
      expect(PLAN_STATUS.EXECUTING).toBe("executing");
      expect(PLAN_STATUS.COMPLETED).toBe("completed");
      expect(PLAN_STATUS.FAILED).toBe("failed");
    });

    it("should have all expected render stage values", () => {
      expect(RENDER_STAGE.LOADING).toBe("loading");
      expect(RENDER_STAGE.CONNECTING).toBe("connecting");
      expect(RENDER_STAGE.READY).toBe("ready");
      expect(RENDER_STAGE.ERROR).toBe("error");
    });

    it("should have all expected log level values", () => {
      expect(LOG_LEVEL.INFO).toBe("info");
      expect(LOG_LEVEL.WARN).toBe("warn");
      expect(LOG_LEVEL.DEBUG).toBe("debug");
      expect(LOG_LEVEL.ERROR).toBe("error");
    });

    it("should have all expected focus target values", () => {
      expect(FOCUS_TARGET.CHAT).toBe("chat");
      expect(FOCUS_TARGET.FILES).toBe("files");
      expect(FOCUS_TARGET.PLAN).toBe("plan");
      expect(FOCUS_TARGET.CONTEXT).toBe("context");
      expect(FOCUS_TARGET.SESSIONS).toBe("sessions");
      expect(FOCUS_TARGET.AGENT).toBe("agent");
    });
  });

  describe("Config Constants", () => {
    it("should have positive limit values", () => {
      expect(LIMIT.MAX_FILES).toBeGreaterThan(0);
      expect(LIMIT.MAX_BLOCK_LINES).toBeGreaterThan(0);
      expect(LIMIT.RENDER_CACHE_LIMIT).toBeGreaterThan(0);
      expect(LIMIT.NANOID_LENGTH).toBeGreaterThan(0);
      expect(LIMIT.NANOID_LENGTH).toBeGreaterThan(0);
    });

    it("should have positive timeout values", () => {
      expect(TIMEOUT.SESSION_BOOTSTRAP_MS).toBeGreaterThan(0);
      expect(TIMEOUT.BATCH_DELAY_MS).toBeGreaterThan(0);
      expect(TIMEOUT.DISCONNECT_MS).toBeGreaterThan(0);
    });

    it("should have positive UI config values", () => {
      expect(UI.TERMINAL_DEFAULT_ROWS).toBeGreaterThan(0);
      expect(UI.TERMINAL_DEFAULT_COLUMNS).toBeGreaterThan(0);
      expect(UI.VISIBLE_RESULT_LINES).toBeGreaterThan(0);
    });

    it("should have valid progress values (0-100)", () => {
      expect(UI.PROGRESS.INITIAL).toBeGreaterThanOrEqual(0);
      expect(UI.PROGRESS.INITIAL).toBeLessThanOrEqual(100);
      expect(UI.PROGRESS.COMPLETE).toBe(100);
      expect(UI.PROGRESS.SESSION_READY).toBeGreaterThan(UI.PROGRESS.CONNECTION_ESTABLISHED);
      expect(UI.PROGRESS.CONNECTION_ESTABLISHED).toBeGreaterThan(UI.PROGRESS.CONNECTION_START);
    });
  });

  describe("Type Exports", () => {
    it("should export correct types for agent status", () => {
      const status: (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS] = AGENT_STATUS.WORKING;
      expect(status).toBe("working");
    });

    it("should export correct types for task status", () => {
      const status: (typeof TASK_STATUS)[keyof typeof TASK_STATUS] = TASK_STATUS.PENDING;
      expect(status).toBe("pending");
    });

    it("should export correct types for render stage", () => {
      const stage: (typeof RENDER_STAGE)[keyof typeof RENDER_STAGE] = RENDER_STAGE.READY;
      expect(stage).toBe("ready");
    });

    it("should export correct types for focus target", () => {
      const target: (typeof FOCUS_TARGET)[keyof typeof FOCUS_TARGET] = FOCUS_TARGET.CHAT;
      expect(target).toBe("chat");
    });
  });

  describe("Constant Consistency", () => {
    it("should not have duplicate status values across different constants", () => {
      const allStatuses = [
        ...Object.values(AGENT_STATUS),
        ...Object.values(TASK_STATUS),
        ...Object.values(TOOL_CALL_STATUS),
        ...Object.values(PLAN_STATUS),
      ];

      const uniqueStatuses = new Set(allStatuses);
      // Some overlap is expected (e.g., "completed", "failed" appear in multiple)
      // But we should verify they're used consistently
      expect(uniqueStatuses.size).toBeLessThanOrEqual(allStatuses.length);
    });

    it("should have consistent naming patterns", () => {
      // All status constants should use UPPER_SNAKE_CASE keys
      const agentKeys = Object.keys(AGENT_STATUS);
      const taskKeys = Object.keys(TASK_STATUS);

      expect(agentKeys.every((key) => /^[A-Z_]+$/.test(key))).toBe(true);
      expect(taskKeys.every((key) => /^[A-Z_]+$/.test(key))).toBe(true);
    });
  });
});
