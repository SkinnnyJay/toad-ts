import { LIMIT } from "@/config/limits";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { SIDEBAR_TAB } from "@/constants/sidebar-tabs";
import { THEME } from "@/constants/themes";
import { type SessionSnapshot, SessionSnapshotSchema } from "@/store/session-persistence";
import {
  MessageIdSchema,
  MessageSchema,
  PlanIdSchema,
  PlanSchema,
  SessionSchema,
} from "@/types/domain";
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
  removeMessages: (sessionId: SessionId, messageIds: MessageId[]) => void;
  restoreSessionSnapshot: (session: Session, messages: Message[], plan?: Plan) => void;
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
  setShowToolDetails: (value: boolean) => void;
  toggleToolDetails: () => void;
  setShowThinking: (value: boolean) => void;
  toggleThinking: () => void;
  setTheme: (theme: AppState["uiState"]["theme"]) => void;
  hydrate: (snapshot: SessionSnapshot) => void;
  reset: () => void;
}

const initialState: AppState = {
  connectionStatus: CONNECTION_STATUS.DISCONNECTED,
  currentSessionId: undefined,
  sessions: {},
  messages: {},
  plans: {},
  contextAttachments: {},
  uiState: {
    sidebarTab: SIDEBAR_TAB.FILES,
    accordionCollapsed: {},
    showToolDetails: true,
    showThinking: true,
    theme: THEME.DEFAULT,
  },
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
  removeMessages: (sessionId, messageIds) =>
    set((state) => {
      if (messageIds.length === 0) return {};
      const messageIdSet = new Set(messageIds.map((id) => String(id)));
      const entries = Object.entries(state.messages) as Array<[string, Message]>;
      const retainedEntries = entries.filter(([id]) => !messageIdSet.has(id));
      const retained = Object.fromEntries(retainedEntries) as AppState["messages"];
      const session = state.sessions[sessionId];
      const updatedSession = session
        ? {
            ...session,
            messageIds: session.messageIds.filter((id) => !messageIdSet.has(String(id))),
            updatedAt: Date.now(),
          }
        : undefined;
      return {
        messages: retained,
        sessions: updatedSession
          ? { ...state.sessions, [sessionId]: updatedSession }
          : state.sessions,
      } as Partial<AppState>;
    }),
  restoreSessionSnapshot: (session, messages, plan) =>
    set((state) => {
      const parsedSession = SessionSchema.parse(session);
      const parsedMessages = messages.map((message) => MessageSchema.parse(message));
      const retainedMessages: AppState["messages"] = {};
      for (const [id, message] of Object.entries(state.messages)) {
        const parsedMessage = MessageSchema.parse(message);
        if (parsedMessage.sessionId !== parsedSession.id) {
          retainedMessages[MessageIdSchema.parse(id)] = parsedMessage;
        }
      }
      for (const message of parsedMessages) {
        retainedMessages[message.id] = message;
      }

      const retainedPlans: AppState["plans"] = {};
      for (const [id, existing] of Object.entries(state.plans)) {
        const parsedPlan = PlanSchema.parse(existing);
        if (parsedPlan.sessionId !== parsedSession.id) {
          retainedPlans[PlanIdSchema.parse(id)] = parsedPlan;
        }
      }
      if (plan) {
        const parsedPlan = PlanSchema.parse(plan);
        retainedPlans[parsedPlan.id] = parsedPlan;
      }

      return {
        sessions: { ...state.sessions, [parsedSession.id]: parsedSession },
        messages: retainedMessages,
        plans: retainedPlans,
      } as Partial<AppState>;
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
  setShowToolDetails: (value) =>
    set((state) => ({
      uiState: { ...state.uiState, showToolDetails: value },
    })),
  toggleToolDetails: () =>
    set((state) => ({
      uiState: { ...state.uiState, showToolDetails: !state.uiState.showToolDetails },
    })),
  setShowThinking: (value) =>
    set((state) => ({
      uiState: { ...state.uiState, showThinking: value },
    })),
  toggleThinking: () =>
    set((state) => ({
      uiState: { ...state.uiState, showThinking: !state.uiState.showThinking },
    })),
  setTheme: (theme) =>
    set((state) => ({
      uiState: { ...state.uiState, theme },
    })),
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
