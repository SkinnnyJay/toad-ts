import { LIMIT } from "@/config/limits";
import { useAppStore } from "@/store/app-store";
import type { SessionId } from "@/types/domain";
import { useUiSymbols } from "@/ui/hooks/useUiSymbols";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo } from "react";
import { TodoItem } from "./TodoItem";

export interface TodoListProps {
  sessionId: SessionId | undefined;
}

function TodoListComponent({ sessionId }: TodoListProps): ReactNode {
  const symbols = useUiSymbols();
  const todos = useAppStore((state) => (sessionId ? state.getTodosForSession(sessionId) : []));
  const displayTodos = todos.slice(0, LIMIT.SIDEBAR_TASKS_DISPLAY);
  const hasMore = todos.length > LIMIT.SIDEBAR_TASKS_DISPLAY;

  if (!sessionId) {
    return (
      <text attributes={TextAttributes.DIM} wrapMode="word">
        No session selected
      </text>
    );
  }

  if (todos.length === 0) {
    return (
      <text attributes={TextAttributes.DIM} wrapMode="word">
        No tasks yet. Agent can add tasks with todo_write.
      </text>
    );
  }

  return (
    <box flexDirection="column" gap={0} width="100%" overflow="hidden" minWidth={0}>
      {displayTodos.map((item) => (
        <TodoItem
          key={item.id}
          item={item}
          symbols={symbols}
          maxContentLength={LIMIT.SIDEBAR_TRUNCATE_LENGTH}
        />
      ))}
      {hasMore ? (
        <text attributes={TextAttributes.DIM}>
          {symbols.ELLIPSIS} {todos.length - LIMIT.SIDEBAR_TASKS_DISPLAY} more
        </text>
      ) : null}
    </box>
  );
}

export const TodoList = memo(TodoListComponent);
