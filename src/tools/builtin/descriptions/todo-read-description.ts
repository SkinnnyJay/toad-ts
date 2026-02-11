/**
 * AI-facing description for the todo_read tool. Read-only; returns current list and active count.
 */
export const TODO_READ_DESCRIPTION = `Read the current session todo list.

Purpose: Query the list of tasks for the current session. Read-only; does not modify the list.

Returns: The current todo items (optionally filtered by status) and the count of active (non-completed, non-cancelled) tasks.`;
