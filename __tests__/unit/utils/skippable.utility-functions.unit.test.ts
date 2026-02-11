import { describe, expect, it } from "vitest";
import { PLAN_STATUS } from "../../../src/constants/plan-status";
import { planStatusColor } from "../../../src/ui/status-colors";
import { roleColor } from "../../../src/ui/theme";
import { withTimeout } from "../../../src/utils/async/withTimeout";
import {
  getCorrelationContext,
  withCorrelationContext,
} from "../../../src/utils/logging/correlation-context";

describe("Utility Functions", () => {
  describe("withTimeout()", () => {
    it("should resolve when promise completes before timeout", async () => {
      const promise = Promise.resolve("success");
      const result = await withTimeout(promise, "connect", 1000);

      expect(result).toBe("success");
    });

    it("should reject when timeout is exceeded", async () => {
      const promise = new Promise((resolve) => setTimeout(() => resolve("slow"), 2000));
      await expect(withTimeout(promise, "connect", 100)).rejects.toThrow("timed out");
    });

    it("should handle errors from promise", async () => {
      const promise = Promise.reject(new Error("test error"));
      await expect(withTimeout(promise, "connect", 1000)).rejects.toThrow("test error");
    });
  });

  describe("correlation context", () => {
    it("should get and set correlation context", async () => {
      await withCorrelationContext({ requestId: "req-1", userId: "user-1" }, async () => {
        const retrieved = getCorrelationContext();
        expect(retrieved?.requestId).toBe("req-1");
        expect(retrieved?.userId).toBe("user-1");
      });
    });

    it("should return undefined when not in context", () => {
      const context = getCorrelationContext();

      // Outside of withCorrelationContext, should be undefined
      expect(context).toBeUndefined();
    });
  });

  describe("status colors", () => {
    it("should return color for plan status", () => {
      const color = planStatusColor(PLAN_STATUS.PLANNING);
      expect(color).toBeDefined();
    });

    it("should handle all plan statuses", () => {
      const statuses = [
        PLAN_STATUS.PLANNING,
        PLAN_STATUS.EXECUTING,
        PLAN_STATUS.COMPLETED,
        PLAN_STATUS.FAILED,
      ];

      statuses.forEach((status) => {
        expect(() => planStatusColor(status)).not.toThrow();
      });
    });
  });

  describe("theme colors", () => {
    it("should return color for message role", () => {
      const color = roleColor("user");
      expect(color).toBeDefined();

      const color2 = roleColor("assistant");
      expect(color2).toBeDefined();
    });
  });
});
