import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { PLAN_STATUS } from "../../../src/constants/plan-status";
import { TASK_STATUS } from "../../../src/constants/task-status";
import { PlanIdSchema, TaskIdSchema } from "../../../src/types/domain";
import { PlanApprovalPanel } from "../../../src/ui/components/PlanApprovalPanel";
import { PlanPanel } from "../../../src/ui/components/PlanPanel";
import { TruncationProvider } from "../../../src/ui/components/TruncationProvider";
import { cleanup, renderInk } from "../../utils/ink-test-helpers";

afterEach(() => {
  cleanup();
});

describe("Plan Components", () => {
  const createMockPlan = () => ({
    id: PlanIdSchema.parse("plan-1"),
    sessionId: "session-1",
    originalPrompt: "Test plan",
    status: PLAN_STATUS.PLANNING,
    tasks: [
      {
        id: TaskIdSchema.parse("task-1"),
        title: "Task 1",
        status: TASK_STATUS.PENDING,
        dependencies: [],
      },
      {
        id: TaskIdSchema.parse("task-2"),
        title: "Task 2",
        status: TASK_STATUS.PENDING,
        dependencies: ["task-1"],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  describe("PlanPanel", () => {
    it("should render plan with tasks", () => {
      const plan = createMockPlan();
      const { lastFrame } = renderInk(
        React.createElement(TruncationProvider, {}, React.createElement(PlanPanel, { plan }))
      );

      expect(lastFrame()).toContain("Test plan");
      expect(lastFrame()).toContain("Task 1");
    });

    it("should show empty state when no tasks", () => {
      const plan = {
        ...createMockPlan(),
        tasks: [],
      };
      const { lastFrame } = renderInk(
        React.createElement(TruncationProvider, {}, React.createElement(PlanPanel, { plan }))
      );

      expect(lastFrame()).toContain("No tasks");
    });
  });

  describe("PlanApprovalPanel", () => {
    it("should render approval panel for planning status", () => {
      const plan = createMockPlan();
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(PlanApprovalPanel, {
            plan,
            onApprove: () => {},
            onDeny: () => {},
          })
        )
      );

      expect(lastFrame()).toContain("Plan:");
      expect(lastFrame()).toContain("Review and approve");
    });

    it("should show execution progress", () => {
      const plan = {
        ...createMockPlan(),
        status: PLAN_STATUS.EXECUTING,
      };
      const { lastFrame } = renderInk(
        React.createElement(
          TruncationProvider,
          {},
          React.createElement(PlanApprovalPanel, {
            plan,
            onApprove: () => {},
            onDeny: () => {},
          })
        )
      );

      expect(lastFrame()).toContain("Executing");
    });
  });
});
