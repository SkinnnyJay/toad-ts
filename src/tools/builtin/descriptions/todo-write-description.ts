/**
 * AI-facing description for the todo_write tool. When to use, when not to use,
 * task states, and management rules (e.g. only one in_progress at a time).
 */
export const TODO_WRITE_DESCRIPTION = `Replace or merge the session todo list.

When to use:
- Complex multi-step tasks that benefit from an explicit task list
- Non-trivial operations where the user or agent wants to track progress
- User-provided task lists or ordered instructions

When NOT to use:
- Single trivial tasks (e.g. "read file X")
- Purely conversational requests with no steps to track

Task states: pending, in_progress, completed, cancelled.

Rules:
- Only one task should be in_progress at a time. When advancing, set the previous task to completed and the next to in_progress.
- Update status immediately when starting or finishing a task.
- Each item must have a unique id, content, status, and optionally priority (high, medium, low).`;
