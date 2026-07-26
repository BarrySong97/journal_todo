import type { TodoItem } from "@/lib/types/journal"

export type SortDirection = "incomplete-first" | "incomplete-last"

/**
 * Stable partition by completion status. Relative order within each
 * status group is preserved; only the grouping order changes.
 */
export function partitionByStatus<T extends { status: TodoItem["status"] }>(
  items: T[],
  direction: SortDirection
): T[] {
  const incomplete = items.filter((item) => item.status !== "done")
  const done = items.filter((item) => item.status === "done")
  return direction === "incomplete-first" ? [...incomplete, ...done] : [...done, ...incomplete]
}

/**
 * Recursively reorders a flat, order-sorted todo list by applying
 * `reorderGroup` to each parent's children independently. A todo's children
 * always stay nested directly beneath it (moving as a block).
 */
function sortTodoTree(todos: TodoItem[], reorderGroup: (group: TodoItem[]) => TodoItem[]): TodoItem[] {
  const sorted = [...todos].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
  const childrenByParent = new Map<string | null, TodoItem[]>()
  for (const todo of sorted) {
    const key = todo.parentId ?? null
    const list = childrenByParent.get(key)
    if (list) list.push(todo)
    else childrenByParent.set(key, [todo])
  }

  const result: TodoItem[] = []
  const visit = (parentId: string | null) => {
    const children = childrenByParent.get(parentId)
    if (!children) return
    for (const child of reorderGroup(children)) {
      result.push(child)
      visit(child.id)
    }
  }
  visit(null)

  return result
}

/**
 * Groups each parent's children by completion status per `direction`,
 * preserving each group's relative order otherwise.
 */
export function sortTodoTreeOrder(todos: TodoItem[], direction: SortDirection): TodoItem[] {
  return sortTodoTree(todos, (group) => partitionByStatus(group, direction))
}
