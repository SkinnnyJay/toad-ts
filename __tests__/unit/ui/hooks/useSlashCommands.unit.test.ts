import { SLASH_COMMAND } from "@/constants/slash-commands";
import { parseSlashCommand } from "@/ui/hooks/useSlashCommands";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useSlashCommands", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("parseSlashCommand", () => {
    it("parses command without arguments", () => {
      const result = parseSlashCommand("/help");

      expect(result.command).toBe("/help");
      expect(result.args).toEqual([]);
    });

    it("parses command with single argument", () => {
      const result = parseSlashCommand("/mode auto");

      expect(result.command).toBe("/mode");
      expect(result.args).toEqual(["auto"]);
    });

    it("parses command with multiple arguments", () => {
      const result = parseSlashCommand("/plan Create new feature");

      expect(result.command).toBe("/plan");
      expect(result.args).toEqual(["Create", "new", "feature"]);
    });

    it("returns undefined command for non-slash input", () => {
      const result = parseSlashCommand("hello world");

      expect(result.command).toBeUndefined();
      expect(result.args).toEqual([]);
    });

    it("handles empty string", () => {
      const result = parseSlashCommand("");

      expect(result.command).toBeUndefined();
      expect(result.args).toEqual([]);
    });

    it("handles leading whitespace (returns undefined)", () => {
      // Leading whitespace means it doesn't start with /
      const result = parseSlashCommand("  /help  ");

      expect(result.command).toBeUndefined();
    });

    it("trims trailing whitespace on valid command", () => {
      const result = parseSlashCommand("/help  ");

      expect(result.command).toBe("/help");
    });

    it("converts command to lowercase", () => {
      const result = parseSlashCommand("/HELP");

      expect(result.command).toBe("/help");
    });

    it("handles multiple spaces between arguments", () => {
      const result = parseSlashCommand("/plan   Create    feature");

      expect(result.command).toBe("/plan");
      expect(result.args).toEqual(["Create", "feature"]);
    });
  });

  describe("slash command constants", () => {
    it("has expected command values", () => {
      expect(SLASH_COMMAND.CONNECT).toBe("/connect");
      expect(SLASH_COMMAND.COMPACT).toBe("/compact");
      expect(SLASH_COMMAND.CONTEXT).toBe("/context");
      expect(SLASH_COMMAND.COST).toBe("/cost");
      expect(SLASH_COMMAND.DEBUG).toBe("/debug");
      expect(SLASH_COMMAND.DOCTOR).toBe("/doctor");
      expect(SLASH_COMMAND.EDITOR).toBe("/editor");
      expect(SLASH_COMMAND.HELP).toBe("/help");
      expect(SLASH_COMMAND.HOOKS).toBe("/hooks");
      expect(SLASH_COMMAND.DETAILS).toBe("/details");
      expect(SLASH_COMMAND.MEMORY).toBe("/memory");
      expect(SLASH_COMMAND.MODE).toBe("/mode");
      expect(SLASH_COMMAND.MODELS).toBe("/models");
      expect(SLASH_COMMAND.NEW).toBe("/new");
      expect(SLASH_COMMAND.CLEAR).toBe("/clear");
      expect(SLASH_COMMAND.COPY).toBe("/copy");
      expect(SLASH_COMMAND.PLAN).toBe("/plan");
      expect(SLASH_COMMAND.REWIND).toBe("/rewind");
      expect(SLASH_COMMAND.RENAME).toBe("/rename");
      expect(SLASH_COMMAND.SESSIONS).toBe("/sessions");
      expect(SLASH_COMMAND.SETTINGS).toBe("/settings");
      expect(SLASH_COMMAND.STATS).toBe("/stats");
      expect(SLASH_COMMAND.THEMES).toBe("/themes");
      expect(SLASH_COMMAND.THINKING).toBe("/thinking");
      expect(SLASH_COMMAND.VIM).toBe("/vim");
      expect(SLASH_COMMAND.UNDO).toBe("/undo");
      expect(SLASH_COMMAND.REDO).toBe("/redo");
      expect(SLASH_COMMAND.SHARE).toBe("/share");
      expect(SLASH_COMMAND.UNSHARE).toBe("/unshare");
    });
  });

  describe("command handling logic", () => {
    it("returns false for non-slash commands", () => {
      const { command } = parseSlashCommand("hello");
      const isSlashCommand = command !== undefined;

      expect(isSlashCommand).toBe(false);
    });

    it("returns true for slash commands", () => {
      const { command } = parseSlashCommand("/help");
      const isSlashCommand = command !== undefined;

      expect(isSlashCommand).toBe(true);
    });

    it("identifies help command", () => {
      const { command } = parseSlashCommand("/help");

      expect(command).toBe(SLASH_COMMAND.HELP);
    });

    it("identifies mode command", () => {
      const { command } = parseSlashCommand("/mode auto");

      expect(command).toBe(SLASH_COMMAND.MODE);
    });

    it("identifies clear command", () => {
      const { command } = parseSlashCommand("/clear");

      expect(command).toBe(SLASH_COMMAND.CLEAR);
    });

    it("identifies plan command", () => {
      const { command } = parseSlashCommand("/plan My Plan");

      expect(command).toBe(SLASH_COMMAND.PLAN);
    });

    it("identifies settings command", () => {
      const { command } = parseSlashCommand("/settings");

      expect(command).toBe(SLASH_COMMAND.SETTINGS);
    });

    it("identifies sessions command", () => {
      const { command } = parseSlashCommand("/sessions");

      expect(command).toBe(SLASH_COMMAND.SESSIONS);
    });
  });

  describe("plan title extraction", () => {
    it("extracts title from args", () => {
      const { args } = parseSlashCommand("/plan Create new feature");
      const title = args.join(" ").trim() || "Plan";

      expect(title).toBe("Create new feature");
    });

    it("defaults to Plan when no title provided", () => {
      const { args } = parseSlashCommand("/plan");
      const title = args.join(" ").trim() || "Plan";

      expect(title).toBe("Plan");
    });
  });

  describe("hook export", () => {
    it("exports useSlashCommands function", async () => {
      const { useSlashCommands } = await import("@/ui/hooks/useSlashCommands");
      expect(typeof useSlashCommands).toBe("function");
    });

    it("exports parseSlashCommand function", async () => {
      const { parseSlashCommand } = await import("@/ui/hooks/useSlashCommands");
      expect(typeof parseSlashCommand).toBe("function");
    });
  });
});
