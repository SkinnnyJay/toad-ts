import { PERMISSION } from "@/constants/permissions";
import {
  PERMISSION_MODE,
  createPermissionResolver,
  cyclePermissionMode,
  resolveToolPermission,
} from "@/core/permission-modes";
import { describe, expect, it } from "vitest";

describe("PermissionModes", () => {
  describe("cyclePermissionMode", () => {
    it("should cycle through modes", () => {
      expect(cyclePermissionMode(PERMISSION_MODE.NORMAL)).toBe(PERMISSION_MODE.PLAN);
      expect(cyclePermissionMode(PERMISSION_MODE.PLAN)).toBe(PERMISSION_MODE.AUTO_ACCEPT);
      expect(cyclePermissionMode(PERMISSION_MODE.AUTO_ACCEPT)).toBe(PERMISSION_MODE.NORMAL);
    });
  });

  describe("resolveToolPermission", () => {
    it("should allow all tools in auto-accept mode", () => {
      expect(resolveToolPermission("write", PERMISSION_MODE.AUTO_ACCEPT, {})).toBe(
        PERMISSION.ALLOW
      );
      expect(resolveToolPermission("bash", PERMISSION_MODE.AUTO_ACCEPT, {})).toBe(PERMISSION.ALLOW);
    });

    it("should allow reads but ask for writes in plan mode", () => {
      expect(resolveToolPermission("read", PERMISSION_MODE.PLAN, {})).toBe(PERMISSION.ALLOW);
      expect(resolveToolPermission("write", PERMISSION_MODE.PLAN, {})).toBe(PERMISSION.ASK);
    });

    it("should respect explicit glob rules over mode defaults", () => {
      const rules = { write: "allow" as const };
      expect(resolveToolPermission("write", PERMISSION_MODE.NORMAL, rules)).toBe("allow");
    });

    it("should match wildcard patterns", () => {
      const rules = { "bash*": "deny" as const };
      expect(resolveToolPermission("bash_exec", PERMISSION_MODE.AUTO_ACCEPT, rules)).toBe("deny");
    });
  });

  describe("createPermissionResolver", () => {
    it("should create a resolver from config", () => {
      const resolver = createPermissionResolver({
        mode: "plan",
        rules: { read: "allow" },
      });
      expect(resolver.mode).toBe(PERMISSION_MODE.PLAN);
      expect(resolver.resolve("read")).toBe("allow");
      expect(resolver.resolve("write")).toBe(PERMISSION.ASK);
    });
  });
});
