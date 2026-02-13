import { CONTENT_BLOCK_TYPE } from "@/constants/content-block-types";
import { ENCODING } from "@/constants/encodings";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import type { Message, Session } from "@/types/domain";

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

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const extractText = (message: Message): string => {
  return message.content
    .map((block) => {
      switch (block.type) {
        case CONTENT_BLOCK_TYPE.TEXT:
          return "text" in block ? block.text : "";
        case CONTENT_BLOCK_TYPE.CODE:
          return "text" in block ? `\`\`\`\n${block.text}\n\`\`\`` : "";
        case CONTENT_BLOCK_TYPE.TOOL_CALL:
          return `[Tool: ${block.name ?? "unknown"}]`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
};

/**
 * Export a session as a self-contained HTML file viewable in a browser.
 * Includes dark theme styling, syntax highlighting placeholders, and responsive layout.
 */
export const exportSessionToHtml = (session: Session, messages: Message[]): string => {
  const title = session.title ?? `Session ${session.id}`;
  const date = new Date(session.createdAt).toLocaleString();

  const messageHtml = messages
    .map((message) => {
      const text = extractText(message);
      if (!text.trim()) return "";
      const roleColor = ROLE_COLORS[message.role] ?? "#888";
      const roleLabel = ROLE_LABELS[message.role] ?? message.role;
      const timestamp = new Date(message.createdAt).toLocaleTimeString();
      const escapedText = escapeHtml(text)
        .replace(/\n/g, "<br>")
        .replace(/`{3}\n?([\s\S]*?)\n?`{3}/g, '<pre class="code-block"><code>$1</code></pre>');

      return `
      <div class="message message-${message.role}">
        <div class="message-header">
          <span class="role" style="color: ${roleColor}">${roleLabel}</span>
          <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-body">${escapedText}</div>
      </div>`;
    })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="${ENCODING.UTF8}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - TOADSTOOL Session</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
           background: #0D1117; color: #E6EDF3; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #58A6FF; margin-bottom: 4px; font-size: 1.5em; }
    .meta { color: #8B949E; margin-bottom: 24px; font-size: 0.9em; }
    .message { border-left: 3px solid #30363D; padding: 12px 16px; margin-bottom: 16px;
               background: #161B22; border-radius: 0 8px 8px 0; }
    .message-user { border-left-color: #58A6FF; }
    .message-assistant { border-left-color: #A78BFA; }
    .message-system { border-left-color: #F59E0B; }
    .message-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .role { font-weight: 600; font-size: 0.9em; }
    .timestamp { color: #8B949E; font-size: 0.8em; }
    .message-body { line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
    .code-block { background: #0D1117; padding: 12px; border-radius: 6px; margin: 8px 0;
                  overflow-x: auto; font-family: 'JetBrains Mono', 'Fira Code', monospace;
                  font-size: 0.85em; border: 1px solid #30363D; }
    .code-block code { color: #E6EDF3; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #30363D;
              color: #8B949E; font-size: 0.8em; text-align: center; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${date} · ${messages.length} messages · Session ${session.id}</div>
  ${messageHtml}
  <div class="footer">Exported from TOADSTOOL · <a href="https://github.com/your-org/toadstool-ts" style="color: #58A6FF;">toadstool-ts</a></div>
</body>
</html>`;
};
