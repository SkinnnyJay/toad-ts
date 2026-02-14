import { LIMIT } from "@/config/limits";
import { CONNECTION_STATUS } from "@/constants/connection-status";
import { SIDEBAR_TAB } from "@/constants/sidebar-tabs";
import { THEME } from "@/constants/themes";
import { type SessionSnapshot, SessionSnapshotSchema } from "@/store/session-persistence";
import {
  getRecentCommandNames,
  setRecentCommandNames as persistRecentCommandNames,
} from "@/store/settings/settings-manager";
import {
  MessageIdSchema,
  MessageSchema,
  PlanIdSchema,
  PlanSchema,
  SessionSchema,
  SubAgentSchema,
} from "@/types/domain";
import type {
  AppState,
  ConnectionStatus,
  LoadedCommand,
  LoadedSkill,
  Message,
  MessageId,
  Plan,
  Session,
  SessionId,
  SubAgent,
  TodoItem,
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
  upsertSubAgent: (agent: SubAgent) => void;
  updateSubAgent: (params: { agentId: SubAgent["id"]; patch: Partial<SubAgent> }) => void;
  getSubAgentsByPlan: (planId: Plan["id"]) => SubAgent[];
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
  setPendingFileRefForInput: (value: string | null) => void;
  setLoadedSkills: (skills: LoadedSkill[]) => void;
  setLoadedCommands: (commands: LoadedCommand[]) => void;
  setRecentCommandNames: (names: string[]) => void;
  recordCommandUsed: (name: string) => void;
  loadRecentCommandsFromSettings: () => Promise<void>;
  setTodosForSession: (sessionId: SessionId, items: TodoItem[]) => void;
  getTodosForSession: (sessionId: SessionId) => TodoItem[];
  hydrate: (snapshot: SessionSnapshot) => void;
  reset: () => void;
}

/** Cache for getMessagesForSession so callers get a stable array reference when messages for a session are unchanged. */
const messagesForSessionCache = new Map<
  SessionId,
  { messageIds: MessageId[]; result: Message[] }
>();
let messagesForSessionCacheStateRef: AppState["messages"] | null = null;

const initialState: AppState = {
  connectionStatus: CONNECTION_STATUS.DISCONNECTED,
  currentSessionId: undefined,
  sessions: {},
  messages: {},
  plans: {},
  subAgents: {},
  todosBySession: {},
  contextAttachments: {},
  loadedSkills: [],
  loadedCommands: [],
  recentCommandNames: [],
  uiState: {
    sidebarTab: SIDEBAR_TAB.FILES,
    accordionCollapsed: {},
    showToolDetails: true,
    showThinking: true,
    theme: THEME.DEFAULT,
    pendingFileRefForInput: null,
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
      const nextMessages: AppState["messages"] = { ...state.messages, [parsed.id]: parsed };
      if (!session) {
        return {
          messages: nextMessages,
          sessions: state.sessions,
        } as Partial<AppState>;
      }

      const nextMessageIds = [...session.messageIds, parsed.id];
      const boundedMessageIds = nextMessageIds.slice(-LIMIT.SESSION_MESSAGES_MAX_IN_MEMORY);
      const droppedMessageCount = nextMessageIds.length - boundedMessageIds.length;
      if (droppedMessageCount > 0) {
        const droppedMessageIds = nextMessageIds.slice(0, droppedMessageCount);
        for (const messageId of droppedMessageIds) {
          delete nextMessages[messageId];
        }
      }

      const updatedSession: Session = {
        ...session,
        messageIds: boundedMessageIds,
        updatedAt: Date.now(),
      };

      return {
        messages: nextMessages,
        sessions: { ...state.sessions, [parsed.sessionId]: updatedSession },
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
  upsertSubAgent: (agent) =>
    set((state) => {
      const parsed = SubAgentSchema.parse(agent);
      return { subAgents: { ...state.subAgents, [parsed.id]: parsed } };
    }),
  updateSubAgent: ({ agentId, patch }) =>
    set((state) => {
      const existing = state.subAgents[agentId];
      if (!existing) return {};
      const updated = SubAgentSchema.parse({ ...existing, ...patch });
      return { subAgents: { ...state.subAgents, [agentId]: updated } };
    }),
  getSubAgentsByPlan: (planId) => {
    const agents = Object.values(get().subAgents) as SubAgent[];
    return agents.filter((agent) => agent.planId === planId);
  },
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
    const state = get();
    const messagesMap = state.messages;
    if (messagesMap !== messagesForSessionCacheStateRef) {
      messagesForSessionCache.clear();
      messagesForSessionCacheStateRef = messagesMap;
    }
    const session = state.sessions[sessionId];
    const orderIds = session?.messageIds ?? [];
    const messages = Object.values(messagesMap) as Message[];
    const forSession = messages.filter((m) => m.sessionId === sessionId);
    const orderSet = new Set(orderIds);
    const sorted =
      orderIds.length > 0
        ? [
            ...orderIds
              .map((id) => forSession.find((m) => m.id === id))
              .filter((m): m is Message => m !== undefined),
            ...forSession
              .filter((m) => !orderSet.has(m.id))
              .sort((a, b) => a.id.localeCompare(b.id)),
          ]
        : forSession.slice().sort((a, b) => a.id.localeCompare(b.id));
    const messageIds = sorted.map((m) => m.id);
    const cached = messagesForSessionCache.get(sessionId);
    if (
      cached &&
      cached.messageIds.length === messageIds.length &&
      cached.messageIds.every((id, i) => id === messageIds[i])
    ) {
      return cached.result;
    }
    const result = sorted;
    messagesForSessionCache.set(sessionId, { messageIds, result });
    return result;
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
  setPendingFileRefForInput: (value) =>
    set((state) => ({
      uiState: { ...state.uiState, pendingFileRefForInput: value },
    })),
  setLoadedSkills: (skills) => set({ loadedSkills: skills }),
  setLoadedCommands: (commands) => set({ loadedCommands: commands }),
  setRecentCommandNames: (names) =>
    set({ recentCommandNames: names.slice(0, LIMIT.RECENT_COMMANDS_STORED) }),
  recordCommandUsed: (name) => {
    const current = get().recentCommandNames;
    const next = [...current.filter((n) => n !== name), name].slice(-LIMIT.RECENT_COMMANDS_STORED);
    set({ recentCommandNames: next });
    persistRecentCommandNames(next).catch(() => {});
  },
  loadRecentCommandsFromSettings: async () => {
    const names = await getRecentCommandNames();
    set({ recentCommandNames: names });
  },
  setTodosForSession: (sessionId, items) =>
    set((state) => ({
      todosBySession: { ...state.todosBySession, [sessionId]: items },
    })),
  getTodosForSession: (sessionId) => get().todosBySession[sessionId] ?? [],
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
      subAgents: {},
      todosBySession: {},
      contextAttachments: {},
    })),
}));

export const defaultState = initialState;
export type { Message, Session };
