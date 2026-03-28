type TodoLike = {
  status?: unknown
  text?: unknown
}

export const hasMeaningfulTodoText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const isMeaningfulTodo = (todo: TodoLike | null | undefined): boolean =>
  hasMeaningfulTodoText(todo?.text)

export const isIncompleteMeaningfulTodo = (todo: TodoLike | null | undefined): boolean =>
  todo?.status === "todo" && isMeaningfulTodo(todo)

export const countIncompleteMeaningfulTodos = (todos: TodoLike[] | null | undefined): number => {
  if (!Array.isArray(todos)) return 0
  return todos.filter((todo) => isIncompleteMeaningfulTodo(todo)).length
}
