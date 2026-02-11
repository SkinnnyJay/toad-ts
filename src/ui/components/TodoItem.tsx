import { COLOR } from "@/constants/colors";
import { TODO_STATUS } from "@/constants/todo-status";
import type { UiSymbols } from "@/constants/ui-symbols";
import type { TodoItem as TodoItemType } from "@/types/domain";
import { TextAttributes } from "@opentui/core";
import { type ReactNode, memo } from "react";

export interface TodoItemProps {
  item: TodoItemType;
  symbols: UiSymbols;
  maxContentLength?: number;
}

const statusIndicator = (status: TodoItemType["status"], symbols: UiSymbols): string => {
  switch (status) {
    case TODO_STATUS.COMPLETED:
      return symbols.CHECK;
    case TODO_STATUS.IN_PROGRESS:
      return symbols.BULLET;
    case TODO_STATUS.CANCELLED:
      return symbols.CROSS;
    default:
      return " ";
  }
};

function TodoItemComponent({ item, symbols, maxContentLength = 60 }: TodoItemProps): ReactNode {
  const indicator = statusIndicator(item.status, symbols);
  const isInProgress = item.status === TODO_STATUS.IN_PROGRESS;
  const isMuted = item.status === TODO_STATUS.COMPLETED || item.status === TODO_STATUS.CANCELLED;
  const content =
    item.content.length > maxContentLength
      ? `${item.content.slice(0, maxContentLength)}${symbols.ELLIPSIS}`
      : item.content;

  return (
    <text
      fg={isInProgress ? COLOR.WARNING : undefined}
      attributes={isMuted ? TextAttributes.DIM : 0}
      wrapMode="word"
    >
      {indicator} {content}
    </text>
  );
}

export const TodoItem = memo(TodoItemComponent);
