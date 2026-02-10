import { SLASH_COMMAND_MESSAGE } from "@/constants/slash-command-messages";
import type { Message, Plan, Session, SessionId } from "@/types/domain";
import { runExportCommand, runImportCommand } from "./slash-command-actions";

export interface ExportSlashCommandDeps {
  sessionId?: SessionId;
  appendSystemMessage: (text: string) => void;
  getSession: (sessionId: SessionId) => Session | undefined;
  getMessagesForSession: (sessionId: SessionId) => Message[];
  getPlanBySession: (sessionId: SessionId) => Plan | undefined;
  getContextAttachments?: (sessionId: SessionId) => string[];
}

export interface ImportSlashCommandDeps {
  appendSystemMessage: (text: string) => void;
  restoreSessionSnapshot?: (session: Session, messages: Message[], plan?: Plan) => void;
  setContextAttachments?: (sessionId: SessionId, attachments: string[]) => void;
}

export const handleExportSlashCommand = (
  deps: ExportSlashCommandDeps,
  fileName: string | undefined
): void => {
  const getContextAttachments = deps.getContextAttachments ?? (() => []);
  void runExportCommand(deps.sessionId, fileName, {
    appendSystemMessage: deps.appendSystemMessage,
    getSession: deps.getSession,
    getMessagesForSession: deps.getMessagesForSession,
    getPlanBySession: deps.getPlanBySession,
    getContextAttachments,
  });
};

export const handleImportSlashCommand = (
  deps: ImportSlashCommandDeps,
  fileName: string | undefined
): void => {
  if (!deps.restoreSessionSnapshot || !deps.setContextAttachments) {
    deps.appendSystemMessage(SLASH_COMMAND_MESSAGE.IMPORT_NOT_AVAILABLE);
    return;
  }
  void runImportCommand(fileName, {
    appendSystemMessage: deps.appendSystemMessage,
    restoreSessionSnapshot: deps.restoreSessionSnapshot,
    setContextAttachments: deps.setContextAttachments,
  });
};
