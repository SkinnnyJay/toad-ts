import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ENCODING } from "@/constants/encodings";
import { FILE_PATH } from "@/constants/file-paths";
import { MESSAGE_ROLE } from "@/constants/message-roles";
import {
  FORMAT_JSON,
  FORMAT_MARKDOWN,
  FORMAT_ZIP,
  SESSION_EXPORT_DEFAULT_EXTENSION,
  SESSION_EXPORT_JSON_EXTENSION,
  SESSION_EXPORT_MARKDOWN_EXTENSION,
  SESSION_EXPORT_VERSION,
  SESSION_EXPORT_ZIP_EXTENSION,
} from "@/constants/session-export";
import type { Message, Plan, Session, SessionId } from "@/types/domain";
import { MessageSchema, PlanSchema, SessionIdSchema, SessionSchema } from "@/types/domain";
import {
  extractBlockText,
  formatSessionMarkdown,
  orderMessages,
} from "@/ui/components/chat/slash-command-helpers";
import { createClassLogger } from "@/utils/logging/logger.utils";
import JSZip from "jszip";
import { z } from "zod";

const logger = createClassLogger("SessionExport");
const ROLE_LABEL: Record<Message["role"], string> = {
  [MESSAGE_ROLE.USER]: "User",
  [MESSAGE_ROLE.ASSISTANT]: "Assistant",
  [MESSAGE_ROLE.SYSTEM]: "System",
};
const EXPORT_JSON_PART = {
  OPEN: "{",
  CLOSE: "}",
  COMMA: ",",
  MESSAGES_START: '"messages":[',
  MESSAGES_END: "]",
  NEWLINE: "\n",
  VERSION: '"version":',
  SESSION: '"session":',
  PLAN: '"plan":',
  CONTEXT_ATTACHMENTS: '"contextAttachments":',
} as const;
const MARKDOWN_EXPORT = {
  MESSAGE_HEADING_PREFIX: "## ",
  EMPTY_CONTENT_PLACEHOLDER: "_(no content)_",
} as const;

export const sessionExportSchema = z
  .object({
    version: z.number().int().nonnegative(),
    session: SessionSchema,
    messages: z.array(MessageSchema),
    plan: PlanSchema.optional(),
    contextAttachments: z.array(z.string()).optional(),
  })
  .strict();

export type SessionExportPayload = z.infer<typeof sessionExportSchema>;

export type SessionExportFormat = "markdown" | "json" | "zip";

export interface SessionExportOptions {
  session: Session;
  messages: Message[];
  plan?: Plan;
  contextAttachments?: string[];
  filePath: string;
}

export interface SessionImportResult {
  session: Session;
  messages: Message[];
  plan?: Plan;
  contextAttachments?: string[];
}

const normalizeExtension = (filePath: string, fallback: string): string => {
  const ext = path.extname(filePath);
  if (ext) {
    return filePath;
  }
  return `${filePath}${fallback}`;
};

export const resolveExportPath = (fileName: string, cwd: string): string => {
  if (path.isAbsolute(fileName) || fileName.includes(path.sep)) {
    return path.resolve(cwd, fileName);
  }
  const exportsDir = path.join(cwd, FILE_PATH.TOADSTOOL_DIR, FILE_PATH.EXPORTS_DIR);
  return path.join(exportsDir, fileName);
};

export const resolveExportFormat = (filePath: string): SessionExportFormat => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === SESSION_EXPORT_JSON_EXTENSION) return FORMAT_JSON;
  if (ext === SESSION_EXPORT_ZIP_EXTENSION) return FORMAT_ZIP;
  return FORMAT_MARKDOWN;
};

export const buildSessionExportPayload = ({
  session,
  messages,
  plan,
  contextAttachments,
}: Omit<SessionExportOptions, "filePath">): SessionExportPayload => {
  const sortedMessages = orderMessages(messages).map((message) => MessageSchema.parse(message));
  return sessionExportSchema.parse({
    version: SESSION_EXPORT_VERSION,
    session,
    messages: sortedMessages,
    plan,
    contextAttachments,
  });
};

export const exportSessionToFile = async (options: SessionExportOptions): Promise<string> => {
  const payload = buildSessionExportPayload(options);
  const normalized = normalizeExtension(options.filePath, SESSION_EXPORT_DEFAULT_EXTENSION);
  const format = resolveExportFormat(normalized);

  if (format === FORMAT_JSON) {
    await writeChunkedTextFile(normalized, buildSessionJsonChunks(payload));
    return normalized;
  }

  if (format === FORMAT_MARKDOWN) {
    await writeChunkedTextFile(normalized, buildSessionMarkdownChunks(payload));
    return normalized;
  }

  const zip = new JSZip();
  zip.file("session.json", buildSessionJsonString(payload));
  zip.file("session.md", formatSessionMarkdown(payload.session, payload.messages));
  if (payload.contextAttachments && payload.contextAttachments.length > 0) {
    zip.file("attachments.json", JSON.stringify(payload.contextAttachments));
  }
  await pipeline(zip.generateNodeStream({ streamFiles: true }), createWriteStream(normalized));
  return normalized;
};

export const importSessionFromFile = async (filePath: string): Promise<SessionImportResult> => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === SESSION_EXPORT_ZIP_EXTENSION) {
    const zip = await JSZip.loadAsync(await readFile(filePath));
    const entry = zip.file("session.json");
    if (!entry) {
      throw new Error("Missing session.json in bundle.");
    }
    const json = await entry.async("string");
    return parseSessionExport(json);
  }
  const raw = await readFile(filePath, ENCODING.UTF8);
  return parseSessionExport(raw);
};

const parseSessionExport = (raw: string): SessionImportResult => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const payload = sessionExportSchema.parse(parsed);
    return {
      session: payload.session,
      messages: payload.messages,
      plan: payload.plan,
      contextAttachments: payload.contextAttachments,
    };
  } catch (error) {
    logger.warn("Failed to parse session export", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const generateDefaultExportName = (sessionId: SessionId): string => {
  const safeId = SessionIdSchema.parse(sessionId);
  return `${safeId}${SESSION_EXPORT_MARKDOWN_EXTENSION}`;
};

const buildSessionJsonChunks = function* (payload: SessionExportPayload): Generator<string> {
  yield EXPORT_JSON_PART.OPEN;
  yield `${EXPORT_JSON_PART.VERSION}${payload.version}`;
  yield EXPORT_JSON_PART.COMMA;
  yield `${EXPORT_JSON_PART.SESSION}${JSON.stringify(payload.session)}`;
  yield EXPORT_JSON_PART.COMMA;
  yield EXPORT_JSON_PART.MESSAGES_START;
  for (const [index, message] of payload.messages.entries()) {
    if (index > 0) {
      yield EXPORT_JSON_PART.COMMA;
    }
    yield JSON.stringify(message);
  }
  yield EXPORT_JSON_PART.MESSAGES_END;
  if (payload.plan) {
    yield EXPORT_JSON_PART.COMMA;
    yield `${EXPORT_JSON_PART.PLAN}${JSON.stringify(payload.plan)}`;
  }
  if (payload.contextAttachments) {
    yield EXPORT_JSON_PART.COMMA;
    yield `${EXPORT_JSON_PART.CONTEXT_ATTACHMENTS}${JSON.stringify(payload.contextAttachments)}`;
  }
  yield EXPORT_JSON_PART.CLOSE;
  yield EXPORT_JSON_PART.NEWLINE;
};

const buildSessionJsonString = (payload: SessionExportPayload): string =>
  Array.from(buildSessionJsonChunks(payload)).join("");

const buildSessionMarkdownChunks = function* (payload: SessionExportPayload): Generator<string> {
  const title = payload.session.title ?? payload.session.id;
  const createdAt = new Date(payload.session.createdAt).toISOString();
  const updatedAt = new Date(payload.session.updatedAt).toISOString();
  yield `# ${title}\n\n`;
  yield `- Session ID: ${payload.session.id}\n`;
  yield `- Created: ${createdAt}\n`;
  yield `- Updated: ${updatedAt}\n\n`;

  const sortedMessages = orderMessages(payload.messages);
  for (const [index, message] of sortedMessages.entries()) {
    const roleLabel = ROLE_LABEL[message.role];
    const content = message.content.map(extractBlockText).join("\n").trim();
    const safeContent = content.length > 0 ? content : MARKDOWN_EXPORT.EMPTY_CONTENT_PLACEHOLDER;
    yield `${MARKDOWN_EXPORT.MESSAGE_HEADING_PREFIX}${roleLabel}\n\n`;
    yield `${safeContent}\n`;
    if (index < sortedMessages.length - 1) {
      yield EXPORT_JSON_PART.NEWLINE;
    }
  }
};

const writeChunkedTextFile = async (
  filePath: string,
  chunks: Generator<string> | Iterable<string>
): Promise<void> => {
  await pipeline(
    Readable.from(chunks, { encoding: ENCODING.UTF8 }),
    createWriteStream(filePath, { encoding: ENCODING.UTF8 })
  );
};
