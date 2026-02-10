import { BACKGROUND_TASK_STATUS } from "@/constants/background-task-status";
import type { BackgroundTask, BackgroundTaskId } from "@/types/domain";
import { create } from "zustand";
import type { StoreApi } from "zustand";

export interface BackgroundTaskStore {
  tasks: Record<BackgroundTaskId, BackgroundTask>;
  addTask: (task: BackgroundTask) => void;
  updateTask: (taskId: BackgroundTaskId, patch: Partial<BackgroundTask>) => void;
  removeTask: (taskId: BackgroundTaskId) => void;
  getTask: (taskId: BackgroundTaskId) => BackgroundTask | undefined;
  listTasks: () => BackgroundTask[];
  getSummary: () => { total: number; completed: number; running: number };
}

export const useBackgroundTaskStore = create<BackgroundTaskStore>()(
  (set: StoreApi<BackgroundTaskStore>["setState"], get) => ({
    tasks: {},
    addTask: (task) =>
      set((state) => ({
        tasks: {
          ...state.tasks,
          [task.id]: task,
        },
      })),
    updateTask: (taskId, patch) =>
      set((state) => {
        const existing = state.tasks[taskId];
        if (!existing) return {};
        return {
          tasks: {
            ...state.tasks,
            [taskId]: { ...existing, ...patch },
          },
        };
      }),
    removeTask: (taskId) =>
      set((state) => {
        const { [taskId]: _removed, ...rest } = state.tasks;
        return { tasks: rest };
      }),
    getTask: (taskId) => get().tasks[taskId],
    listTasks: () => Object.values(get().tasks),
    getSummary: () => {
      const tasks = Object.values(get().tasks);
      const completed = tasks.filter(
        (task) =>
          task.status === BACKGROUND_TASK_STATUS.COMPLETED ||
          task.status === BACKGROUND_TASK_STATUS.FAILED ||
          task.status === BACKGROUND_TASK_STATUS.CANCELLED
      ).length;
      const running = tasks.filter((task) => task.status === BACKGROUND_TASK_STATUS.RUNNING).length;
      return { total: tasks.length, completed, running };
    },
  })
);
