import { BUILTIN_THEMES, resolveTheme } from "@/ui/theme/theme-loader";
import { describe, expect, it } from "vitest";

describe("ThemeLoader", () => {
  it("should have 6 built-in themes", () => {
    const themes = Object.keys(BUILTIN_THEMES);
    expect(themes).toHaveLength(6);
    expect(themes).toContain("dark");
    expect(themes).toContain("light");
    expect(themes).toContain("dracula");
    expect(themes).toContain("monokai");
    expect(themes).toContain("solarized-dark");
    expect(themes).toContain("nord");
  });

  it("should resolve built-in theme by name", async () => {
    const theme = await resolveTheme("dracula", process.cwd());
    expect(theme).not.toBeNull();
    expect(theme?.name).toBe("Dracula");
    expect(theme?.colors.background).toBe("#282A36");
  });

  it("should return null for unknown theme", async () => {
    const theme = await resolveTheme("nonexistent-theme-xyz", process.cwd());
    expect(theme).toBeNull();
  });

  it("should have valid color values in all themes", () => {
    for (const [name, theme] of Object.entries(BUILTIN_THEMES)) {
      expect(theme.colors.background, `${name}.background`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors.foreground, `${name}.foreground`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors.error, `${name}.error`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
