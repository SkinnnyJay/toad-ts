import { LIMIT } from "@/config/limits";
import { type SessionSnapshot, SessionSnapshotSchema } from "@/store/session-persistence";
import { MessageSchema, SessionSchema } from "@/types/domain";
import type {
  AppState,
  ConnectionStatus,
  Message,
  MessageId,
  Plan,
  Session,
  SessionId,
  UpdateMessageParams,
  UpsertSessionParams,
} from "@/types/domain";
import { create } from "zustand";
import type { StoreApi } from "zustand";

export interface AppStore extends AppState {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setCurrentSession: (sessionId: SessionId | undefined) => void;
  upsertSession: (params: UpsertSessionParams) => void;
  appendMessage: (message: Message) => void;
  updateMessage: (params: UpdateMessageParams) => void;
  getSession: (sessionId: SessionId) => Session | undefined;
  getMessage: (messageId: MessageId) => Message | undefined;
  getMessagesForSession: (sessionId: SessionId) => Message[];
  clearMessagesForSession: (sessionId: SessionId) => void;
  upsertPlan: (plan: Plan) => void;
  getPlanBySession: (sessionId: SessionId) => Plan | undefined;
  setContextAttachments: (sessionId: SessionId, attachments: string[]) => void;
  getContextAttachments: (sessionId: SessionId) => string[];
  setSidebarTab: (tab: AppState["uiState"]["sidebarTab"]) => void;
  getSidebarTab: () => AppState["uiState"]["sidebarTab"];
  getAccordionCollapsed: () => AppState["uiState"]["accordionCollapsed"];
  setAccordionCollapsed: (section: AppState["uiState"]["sidebarTab"], isCollapsed: boolean) => void;
  toggleAccordionSection: (section: AppState["uiState"]["sidebarTab"]) => void;
  hydrate: (snapshot: SessionSnapshot) => void;
  reset: () => void;
}

const initialState: AppState = {
  connectionStatus: "disconnected",
  currentSessionId: undefined,
  sessions: {},
  messages: {},
  plans: {},
  contextAttachments: {},
  uiState: { sidebarTab: "files", accordionCollapsed: {} },
};

export const useAppStore = create<AppStore>()((set: StoreApi<AppStore>["setState"], get) => ({
  ...initialState,
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
  upsertSession: ({ session }) =>
    set((state) => {
      const parsed = SessionSchema.parse(session);
      return {
        sessions: {
          ...state.sessions,
          [parsed.id]: parsed,
        },
      } as Partial<AppState>;
    }),
  appendMessage: (message) =>
    set((state) => {
      const parsed = MessageSchema.parse(message);
      const session = state.sessions[parsed.sessionId];
      const updatedSession: Session | undefined = session
        ? {
            ...session,
            messageIds: [...session.messageIds, parsed.id],
            updatedAt: Date.now(),
          }
        : undefined;

      return {
        messages: { ...state.messages, [parsed.id]: parsed },
        sessions: updatedSession
          ? { ...state.sessions, [parsed.sessionId]: updatedSession }
          : state.sessions,
      } as Partial<AppState>;
    }),
  updateMessage: ({ messageId, patch }) =>
    set((state) => {
      const existing = state.messages[messageId];
      if (!existing) return {};
      const updated: Message = { ...existing, ...patch };
      return { messages: { ...state.messages, [messageId]: updated } };
    }),
  clearMessagesForSession: (sessionId) =>
    set((state) => {
      const entries = Object.entries(state.messages) as Array<[string, Message]>;
      const retainedEntries = entries.filter(([, msg]) => msg.sessionId !== sessionId);
      const retained = Object.fromEntries(retainedEntries) as AppState["messages"];
      const session = state.sessions[sessionId];
      const updatedSession = session ? { ...session, messageIds: [] } : undefined;
      return {
        messages: retained,
        sessions: updatedSession
          ? { ...state.sessions, [sessionId]: updatedSession }
          : state.sessions,
      } as Partial<AppState>;
    }),

  getSession: (sessionId) => get().sessions[sessionId],
  getMessage: (messageId) => get().messages[messageId],
  getMessagesForSession: (sessionId) => {
    const messages = Object.values(get().messages) as Message[];
    return messages.filter((m) => m.sessionId === sessionId);
  },
  upsertPlan: (plan) => set((state) => ({ plans: { ...state.plans, [plan.id]: plan } })),
  getPlanBySession: (sessionId) => {
    const plans = Object.values(get().plans) as Plan[];
    return plans.find((plan) => plan.sessionId === sessionId);
  },
  setContextAttachments: (sessionId, attachments) =>
    set((state) => ({
      contextAttachments: {
        ...state.contextAttachments,
        [sessionId]: attachments.slice(0, LIMIT.MAX_FILES),
      },
    })),
  getContextAttachments: (sessionId) => get().contextAttachments[sessionId] ?? [],
  setSidebarTab: (tab) => set((state) => ({ uiState: { ...state.uiState, sidebarTab: tab } })),
  getSidebarTab: () => get().uiState.sidebarTab,
  getAccordionCollapsed: () => get().uiState.accordionCollapsed ?? {},
  setAccordionCollapsed: (section, isCollapsed) =>
    set((state) => ({
      uiState: {
        ...state.uiState,
        accordionCollapsed: {
          ...(state.uiState.accordionCollapsed ?? {}),
          [section]: isCollapsed,
        },
      },
    })),
  toggleAccordionSection: (section) =>
    set((state) => {
      const current = state.uiState.accordionCollapsed?.[section] ?? false;
      return {
        uiState: {
          ...state.uiState,
          accordionCollapsed: {
            ...(state.uiState.accordionCollapsed ?? {}),
            [section]: !current,
          },
        },
      } as Partial<AppState>;
    }),
  hydrate: (snapshot) =>
    set(() => ({
      ...initialState,
      ...SessionSnapshotSchema.parse(snapshot),
    })),
  reset: () =>
    set(() => ({
      ...initialState,
      sessions: {},
      messages: {},
      plans: {},
      contextAttachments: {},
    })),
}));

export const defaultState = initialState;
export type { Message, Session };
