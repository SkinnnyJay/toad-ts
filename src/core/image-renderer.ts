import { LIMIT } from "@/config/limits";

const BLOCK_CHARS = [" ", "░", "▒", "▓", "█"];
const BLOCK_CHAR_COUNT = BLOCK_CHARS.length;

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
    (base64Data.length * (BLOCK_CHAR_COUNT - 2)) / (BLOCK_CHAR_COUNT - 1)
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
  const patternWidth = Math.min(maxWidth - (BLOCK_CHAR_COUNT - 1), 40);
  const patternHeight = Math.min(maxHeight - (BLOCK_CHAR_COUNT + 1), BLOCK_CHAR_COUNT + 3);
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
  const term = process.env.TERM_PROGRAM ?? "";
  const termEnv = process.env.TERM ?? "";
  return (
    term === "iTerm.app" ||
    term === "WezTerm" ||
    termEnv.includes("kitty") ||
    Boolean(process.env.KITTY_PID)
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
