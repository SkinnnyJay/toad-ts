import { describe, expect, it } from "vitest";
import { LIMIT } from "@/config/limits";
import { TIMEOUT } from "@/config/timeouts";
import { UI } from "@/config/ui";
import { COLOR } from "@/constants/colors";
import { PERMISSION } from "@/constants/permissions";
import { PLAN_STATUS } from "@/constants/plan-status";
import { SESSION_MODE } from "@/constants/session-modes";

describe("Constants and Config", () => {
  describe("Constants exports", () => {
    it("should export all required constants", () => {
      expect(COLOR).toBeDefined();
      expect(SESSION_MODE).toBeDefined();
      expect(PLAN_STATUS).toBeDefined();
      expect(PERMISSION).toBeDefined();
    });

    it("should have consistent constant object structure", () => {
      expect(typeof COLOR).toBe("object");
      expect(COLOR.GRAY).toBeDefined();
    });
  });

  describe("Config files", () => {
    it("should export config values", () => {
      expect(LIMIT).toBeDefined();
      expect(TIMEOUT).toBeDefined();
      expect(UI).toBeDefined();
    });

    it("should have numeric values for limits and timeouts", () => {
      expect(typeof LIMIT.SIDEBAR_TASKS_DISPLAY).toBe("number");
      expect(typeof TIMEOUT.AUTO_APPROVE_DEFAULT).toBe("number");
    });
  });
});
