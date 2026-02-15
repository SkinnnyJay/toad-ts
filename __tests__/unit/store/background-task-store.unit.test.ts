import { LIMIT } from "@/config/limits";
import { BACKGROUND_TASK_STATUS } from "@/constants/background-task-status";
import { useBackgroundTaskStore } from "@/store/background-task-store";
import { BackgroundTaskIdSchema } from "@/types/domain";
import type { BackgroundTask } from "@/types/domain";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createTask = (
  index: number,
  status: BackgroundTask["status"],
  completedAt?: number
): BackgroundTask => {
  const timestamp = Date.now() + index;
  return {
    id: BackgroundTaskIdSchema.parse(`task-${index}`),
    command: `echo ${index}`,
    status,
    terminalId: `terminal-${index}`,
    createdAt: timestamp,
    startedAt: timestamp,
    completedAt,
  };
};

const resetTaskStore = (): void => {
  useBackgroundTaskStore.setState({ tasks: {} });
};

describe("background-task-store retention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-14T00:00:00.000Z"));
    resetTaskStore();
  });

  afterEach(() => {
    resetTaskStore();
    vi.useRealTimers();
  });

  it("retains running tasks while capping completed history", () => {
    useBackgroundTaskStore.getState().addTask(createTask(1, BACKGROUND_TASK_STATUS.RUNNING));

    for (let index = 0; index < LIMIT.BACKGROUND_TASK_COMPLETED_MAX_ENTRIES + 5; index += 1) {
      const task = createTask(index + 10, BACKGROUND_TASK_STATUS.COMPLETED, Date.now() + index);
      useBackgroundTaskStore.getState().addTask(task);
    }

    const tasks = useBackgroundTaskStore.getState().listTasks();
    const runningTasks = tasks.filter((task) => task.status === BACKGROUND_TASK_STATUS.RUNNING);
    const completedTasks = tasks.filter((task) => task.status === BACKGROUND_TASK_STATUS.COMPLETED);

    expect(runningTasks).toHaveLength(1);
    expect(completedTasks).toHaveLength(LIMIT.BACKGROUND_TASK_COMPLETED_MAX_ENTRIES);
  });

  it("evicts stale completed tasks beyond retention window", () => {
    const now = Date.now();
    const staleCompleted = createTask(
      1,
      BACKGROUND_TASK_STATUS.COMPLETED,
      now - LIMIT.BACKGROUND_TASK_COMPLETED_RETENTION_MS - 1
    );
    const freshCompleted = createTask(2, BACKGROUND_TASK_STATUS.COMPLETED, now);
    const running = createTask(3, BACKGROUND_TASK_STATUS.RUNNING);

    useBackgroundTaskStore.getState().addTask(staleCompleted);
    useBackgroundTaskStore.getState().addTask(freshCompleted);
    useBackgroundTaskStore.getState().addTask(running);

    const tasks = useBackgroundTaskStore.getState().listTasks();
    const staleTask = tasks.find((task) => task.id === staleCompleted.id);
    const freshTask = tasks.find((task) => task.id === freshCompleted.id);
    const runningTask = tasks.find((task) => task.id === running.id);

    expect(staleTask).toBeUndefined();
    expect(freshTask).toBeDefined();
    expect(runningTask).toBeDefined();
  });
});
