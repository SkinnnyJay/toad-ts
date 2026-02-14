import { LIMIT } from "@/config/limits";
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

const isTerminalBackgroundTask = (task: BackgroundTask): boolean =>
  task.status === BACKGROUND_TASK_STATUS.COMPLETED ||
  task.status === BACKGROUND_TASK_STATUS.FAILED ||
  task.status === BACKGROUND_TASK_STATUS.CANCELLED;

const sortCompletedTasksByNewestFirst = (left: BackgroundTask, right: BackgroundTask): number =>
  (right.completedAt ?? 0) - (left.completedAt ?? 0);

const shouldRetainCompletedTask = (task: BackgroundTask, now: number): boolean => {
  const completedAt = task.completedAt;
  if (!completedAt) {
    return true;
  }
  return now - completedAt <= LIMIT.BACKGROUND_TASK_COMPLETED_RETENTION_MS;
};

const pruneCompletedTasks = (
  tasks: Record<BackgroundTaskId, BackgroundTask>,
  now: number
): Record<BackgroundTaskId, BackgroundTask> => {
  const retained: Record<BackgroundTaskId, BackgroundTask> = {};
  const completedTasks: BackgroundTask[] = [];

  for (const task of Object.values(tasks)) {
    if (!isTerminalBackgroundTask(task)) {
      retained[task.id] = task;
      continue;
    }
    if (shouldRetainCompletedTask(task, now)) {
      completedTasks.push(task);
    }
  }

  const newestCompleted = completedTasks
    .sort(sortCompletedTasksByNewestFirst)
    .slice(0, LIMIT.BACKGROUND_TASK_COMPLETED_MAX_ENTRIES);

  for (const task of newestCompleted) {
    retained[task.id] = task;
  }

  return retained;
};

export const useBackgroundTaskStore = create<BackgroundTaskStore>()(
  (set: StoreApi<BackgroundTaskStore>["setState"], get) => ({
    tasks: {},
    addTask: (task) =>
      set((state) => ({
        tasks: pruneCompletedTasks(
          {
            ...state.tasks,
            [task.id]: task,
          },
          Date.now()
        ),
      })),
    updateTask: (taskId, patch) =>
      set((state) => {
        const existing = state.tasks[taskId];
        if (!existing) return {};
        return {
          tasks: pruneCompletedTasks(
            {
              ...state.tasks,
              [taskId]: { ...existing, ...patch },
            },
            Date.now()
          ),
        };
      }),
    removeTask: (taskId) =>
      set((state) => {
        const { [taskId]: _removed, ...rest } = state.tasks;
        return { tasks: pruneCompletedTasks(rest, Date.now()) };
      }),
    getTask: (taskId) => get().tasks[taskId],
    listTasks: () => Object.values(get().tasks),
    getSummary: () => {
      const tasks = Object.values(get().tasks);
      const completed = tasks.filter((task) => isTerminalBackgroundTask(task)).length;
      const running = tasks.filter((task) => task.status === BACKGROUND_TASK_STATUS.RUNNING).length;
      return { total: tasks.length, completed, running };
    },
  })
);
