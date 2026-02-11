import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENCODING } from "@/constants/encodings";
import { FILE_PATH } from "@/constants/file-paths";
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
import { formatSessionMarkdown, orderMessages } from "@/ui/components/chat/slash-command-helpers";
import { createClassLogger } from "@/utils/logging/logger.utils";
import JSZip from "jszip";
import { z } from "zod";

const logger = createClassLogger("SessionExport");

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
    await writeFile(normalized, JSON.stringify(payload, null, 2), ENCODING.UTF8);
    return normalized;
  }

  if (format === FORMAT_MARKDOWN) {
    const markdown = formatSessionMarkdown(payload.session, payload.messages);
    await writeFile(normalized, markdown, ENCODING.UTF8);
    return normalized;
  }

  const zip = new JSZip();
  zip.file("session.json", JSON.stringify(payload, null, 2));
  zip.file("session.md", formatSessionMarkdown(payload.session, payload.messages));
  if (payload.contextAttachments && payload.contextAttachments.length > 0) {
    zip.file("attachments.json", JSON.stringify(payload.contextAttachments, null, 2));
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await writeFile(normalized, buffer);
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
