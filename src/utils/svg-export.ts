import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { Message } from "@/types/domain";

const SVG_FONT_FAMILY = "monospace, 'Courier New', Courier";
const SVG_FONT_SIZE = 14;
const SVG_LINE_HEIGHT = 20;
const SVG_PADDING = 24;
const SVG_MAX_LINE_WIDTH = 80;
const SVG_CHAR_WIDTH = 8.4;

const ROLE_COLORS: Record<string, string> = {
  [MESSAGE_ROLE.USER]: "#58A6FF",
  [MESSAGE_ROLE.ASSISTANT]: "#A78BFA",
  [MESSAGE_ROLE.SYSTEM]: "#F59E0B",
};

const ROLE_LABELS: Record<string, string> = {
  [MESSAGE_ROLE.USER]: "You",
  [MESSAGE_ROLE.ASSISTANT]: "Assistant",
  [MESSAGE_ROLE.SYSTEM]: "System",
};

const BG_COLOR = "#0D1117";
const TEXT_COLOR = "#E6EDF3";
const BORDER_COLOR = "#30363D";
const CODE_BG = "#161B22";

const escapeXml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const wrapLines = (text: string, maxChars: number): string[] => {
  const result: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine.length <= maxChars) {
      result.push(rawLine);
    } else {
      let remaining = rawLine;
      while (remaining.length > maxChars) {
        result.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      if (remaining.length > 0) result.push(remaining);
    }
  }
  return result;
};

const extractText = (message: Message): string => {
  const parts: string[] = [];
  for (const block of message.content) {
    switch (block.type) {
      case CONTENT_BLOCK_TYPE.TEXT:
        if (block.text) parts.push(block.text);
        break;
      case CONTENT_BLOCK_TYPE.CODE:
        if (block.text) parts.push(`\`\`\`\n${block.text}\n\`\`\``);
        break;
      case CONTENT_BLOCK_TYPE.TOOL_CALL:
        parts.push(`[Tool: ${block.name ?? "unknown"}]`);
        break;
      case CONTENT_BLOCK_TYPE.THINKING:
        if (block.text) parts.push(`<thinking>${block.text}</thinking>`);
        break;
      default:
        break;
    }
  }
  return parts.join("\n");
};

/**
 * Render a conversation as an SVG string suitable for export.
 * Inspired by TOAD's SVG export feature.
 */
export const exportConversationToSvg = (messages: Message[], title?: string): string => {
  const blocks: Array<{ role: string; lines: string[]; isCode: boolean }> = [];

  for (const message of messages) {
    const text = extractText(message);
    if (!text.trim()) continue;

    // Split into code and non-code segments
    const segments = text.split(/(```[\s\S]*?```)/);
    for (const segment of segments) {
      if (segment.startsWith("```")) {
        const codeContent = segment.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
        blocks.push({
          role: message.role,
          lines: wrapLines(codeContent, SVG_MAX_LINE_WIDTH),
          isCode: true,
        });
      } else if (segment.trim()) {
        blocks.push({
          role: message.role,
          lines: wrapLines(segment.trim(), SVG_MAX_LINE_WIDTH),
          isCode: false,
        });
      }
    }
  }

  // Calculate total height
  let currentY = SVG_PADDING;
  if (title) currentY += SVG_LINE_HEIGHT + SVG_PADDING;

  const blockPositions: Array<{ y: number; height: number }> = [];
  let lastRole = "";

  for (const block of blocks) {
    if (block.role !== lastRole) {
      currentY += SVG_LINE_HEIGHT + 8; // Role label
      lastRole = block.role;
    }
    const blockHeight = block.lines.length * SVG_LINE_HEIGHT + (block.isCode ? SVG_PADDING : 8);
    blockPositions.push({ y: currentY, height: blockHeight });
    currentY += blockHeight + 8;
  }

  const totalWidth = Math.ceil(SVG_MAX_LINE_WIDTH * SVG_CHAR_WIDTH + SVG_PADDING * 3);
  const totalHeight = currentY + SVG_PADDING;

  const svgParts: string[] = [];
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`
  );
  svgParts.push(`<rect width="100%" height="100%" fill="${BG_COLOR}" rx="8" />`);

  // Title
  let drawY = SVG_PADDING;
  if (title) {
    svgParts.push(
      `<text x="${SVG_PADDING}" y="${drawY + SVG_FONT_SIZE}" fill="${TEXT_COLOR}" font-family="${SVG_FONT_FAMILY}" font-size="${SVG_FONT_SIZE + 2}" font-weight="bold">${escapeXml(title)}</text>`
    );
    drawY += SVG_LINE_HEIGHT + SVG_PADDING;
    svgParts.push(
      `<line x1="${SVG_PADDING}" y1="${drawY - 8}" x2="${totalWidth - SVG_PADDING}" y2="${drawY - 8}" stroke="${BORDER_COLOR}" stroke-width="1" />`
    );
  }

  lastRole = "";
  let blockIndex = 0;

  for (const block of blocks) {
    const pos = blockPositions[blockIndex];
    if (!pos) {
      blockIndex++;
      continue;
    }

    // Role label
    if (block.role !== lastRole) {
      const roleColor = ROLE_COLORS[block.role] ?? TEXT_COLOR;
      const roleLabel = ROLE_LABELS[block.role] ?? block.role;
      svgParts.push(
        `<text x="${SVG_PADDING}" y="${pos.y - 4}" fill="${roleColor}" font-family="${SVG_FONT_FAMILY}" font-size="${SVG_FONT_SIZE}" font-weight="bold">${escapeXml(roleLabel)}</text>`
      );
      lastRole = block.role;
    }

    const textX = SVG_PADDING + (block.isCode ? 12 : 0);

    if (block.isCode) {
      svgParts.push(
        `<rect x="${SVG_PADDING}" y="${pos.y}" width="${totalWidth - SVG_PADDING * 2}" height="${pos.height}" fill="${CODE_BG}" rx="4" />`
      );
    }

    for (let i = 0; i < block.lines.length; i++) {
      const line = block.lines[i];
      if (line === undefined) continue;
      const lineY = pos.y + (i + 1) * SVG_LINE_HEIGHT;
      svgParts.push(
        `<text x="${textX}" y="${lineY}" fill="${TEXT_COLOR}" font-family="${SVG_FONT_FAMILY}" font-size="${SVG_FONT_SIZE}">${escapeXml(line)}</text>`
      );
    }

    blockIndex++;
  }

  svgParts.push("</svg>");
  return svgParts.join("\n");
};
