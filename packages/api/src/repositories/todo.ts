import type { TodoItem, Result } from "@journal-todo/db"
import { getAdapter } from "../adapter"

/**
 * Get all todos for a specific page
 */
export async function getTodos(
  workspaceId: string,
  date: string
): Promise<Result<TodoItem[]>> {
  const adapter = getAdapter()
  return adapter.getTodos(workspaceId, date)
}

/**
 * Create a new todo
 */
export async function createTodo(
  workspaceId: string,
  date: string,
  todo: TodoItem
): Promise<Result<TodoItem>> {
  const adapter = getAdapter()
  return adapter.createTodo(workspaceId, date, todo)
}

/**
 * Update an existing todo
 */
export async function updateTodo(
  id: string,
  data: Partial<TodoItem>
): Promise<Result<TodoItem>> {
  const adapter = getAdapter()
  return adapter.updateTodo(id, data)
}

/**
 * Delete a todo
 */
export async function deleteTodo(id: string): Promise<Result<void>> {
  const adapter = getAdapter()
  return adapter.deleteTodo(id)
}

