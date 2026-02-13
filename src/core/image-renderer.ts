import { LIMIT } from "@/config/limits";
import { ENV_KEY } from "@/constants/env-keys";
import { TERMINAL_KEYWORD, TERMINAL_PROGRAM } from "@/constants/terminal-programs";
import { EnvManager } from "@/utils/env/env.utils";

const BLOCK_CHARS = [" ", "░", "▒", "▓", "█"];

/**
 * Render a base64 image as ASCII art for terminal display.
 * This is a fallback when the terminal doesn't support inline images.
 */
export const renderImageAsAscii = (
  base64Data: string,
  mimeType: string,
  maxWidth = 60,
  maxHeight = 30
): string => {
  // For terminals without image protocol support, show a placeholder
  // Full ASCII art rendering would require an image decoding library
  const sizeEstimate = Math.ceil(
    (base64Data.length * LIMIT.IMAGE_BASE64_BYTE_NUMERATOR) / LIMIT.IMAGE_BASE64_BYTE_DENOMINATOR
  );
  const sizeKb = Math.round(sizeEstimate / LIMIT.KIBIBYTE_BYTES);

  const border = "─".repeat(maxWidth);
  const lines: string[] = [];
  lines.push(`┌${border}┐`);
  lines.push(
    `│${"".padStart(Math.floor((maxWidth - 12) / 2))}[Image]${"".padEnd(Math.ceil((maxWidth - 12) / 2) + 5)}│`
  );
  lines.push(
    `│${"".padStart(Math.floor((maxWidth - 20) / 2))}${mimeType} (${sizeKb}KB)${"".padEnd(Math.max(0, Math.ceil((maxWidth - 20) / 2) - String(sizeKb).length))}│`
  );
  lines.push(`│${"".padStart(maxWidth)}│`);

  // Simple visual pattern to indicate an image
  const patternWidth = Math.min(maxWidth - LIMIT.IMAGE_PATTERN_FRAME_PADDING, 40);
  const patternHeight = Math.min(
    maxHeight - LIMIT.IMAGE_PATTERN_FRAME_PADDING,
    BLOCK_CHARS.length + LIMIT.IMAGE_PATTERN_HEIGHT_PADDING
  );
  for (let y = 0; y < patternHeight; y++) {
    let row = "│  ";
    for (let x = 0; x < patternWidth; x++) {
      const charIndex = Math.floor((x + y) % BLOCK_CHARS.length);
      row += BLOCK_CHARS[charIndex] ?? " ";
    }
    row = `${row.padEnd(maxWidth + 1)}│`;
    lines.push(row);
  }

  lines.push(`│${"".padStart(maxWidth)}│`);
  lines.push(`└${border}┘`);

  return lines.join("\n");
};

/**
 * Check if the terminal supports inline image display (iTerm2/Kitty protocol).
 */
export const supportsInlineImages = (): boolean => {
  const env = EnvManager.getInstance().getSnapshot();
  const term = env[ENV_KEY.TERM_PROGRAM] ?? "";
  const termEnv = env[ENV_KEY.TERM] ?? "";
  return (
    term === TERMINAL_PROGRAM.ITERM_APP ||
    term === TERMINAL_PROGRAM.WEZTERM ||
    termEnv.includes(TERMINAL_KEYWORD.KITTY) ||
    Boolean(env[ENV_KEY.KITTY_PID])
  );
};

/**
 * Render an image using the iTerm2 inline image protocol.
 * Falls back to ASCII art if not supported.
 */
export const renderImage = (
  base64Data: string,
  mimeType: string,
  options?: { width?: number; height?: number }
): string => {
  if (supportsInlineImages()) {
    // iTerm2 inline image protocol
    const width = options?.width ?? "auto";
    const height = options?.height ?? "auto";
    return `\x1b]1337;File=inline=1;width=${width};height=${height}:${base64Data}\x07`;
  }

  return renderImageAsAscii(base64Data, mimeType, options?.width, options?.height);
};
