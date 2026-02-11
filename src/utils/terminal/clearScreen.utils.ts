/**
 * Clears the terminal screen and scrollback so the next draw starts at the top.
 * Uses ANSI: clear entire buffer (\x1b[3J), cursor home (\x1b[H), clear screen (\x1b[2J).
 */
export function clearScreen(): void {
  process.stdout.write("\x1b[3J\x1b[H\x1b[2J");
}
