import type { TodoItem, Workspace } from "@/lib/types/journal"
import { buildSourceNodes, compareSourceOrder, type SourceNode } from "./importantTree"
import { isMeaningfulTodo } from "./todoFilters"

export interface AllTodosItem extends TodoItem {
  depth: number
  parentId: string | null
  sourceWorkspaceId: string
  sourceDateKey: string
}

export interface AllTodosGroup {
  workspaceId: string
  workspaceName: string
  dateKey: string
  todos: AllTodosItem[]
}

export type AllTodosSortDirection = "date-asc" | "date-desc"

/**
 * Every incomplete, non-blank todo across all workspaces/dates, plus the
 * ancestor chain needed to keep it in context (even if an ancestor is done).
 * Grouped by date; `direction` controls whether the oldest or newest date
 * group appears first. Item order within a group is left as-is.
 */
export function buildAllTodosGroups(
  workspaces: Record<string, Workspace>,
  direction: AllTodosSortDirection = "date-asc"
): AllTodosGroup[] {
  const nodes = buildSourceNodes(workspaces)

  const included = new Set<string>()
  for (const node of nodes.values()) {
    if (node.todo.status === "done" || !isMeaningfulTodo(node.todo)) continue
    let current: SourceNode | undefined = node
    while (current && !included.has(current.todo.id)) {
      included.add(current.todo.id)
      current = current.parentId ? nodes.get(current.parentId) : undefined
    }
  }

  const rootsByPage = new Map<string, SourceNode[]>()
  for (const node of nodes.values()) {
    if (node.parentId !== null || !included.has(node.todo.id)) continue
    const key = `${node.workspaceId}::${node.dateKey}`
    const list = rootsByPage.get(key)
    if (list) list.push(node)
    else rootsByPage.set(key, [node])
  }

  const pageKeys = [...rootsByPage.keys()].sort((a, b) => {
    const [workspaceIdA, dateA] = a.split("::")
    const [workspaceIdB, dateB] = b.split("::")
    if (dateA !== dateB) {
      const cmp = dateA < dateB ? -1 : 1
      return direction === "date-asc" ? cmp : -cmp
    }
    const nameA = workspaces[workspaceIdA]?.name ?? ""
    const nameB = workspaces[workspaceIdB]?.name ?? ""
    return nameA.localeCompare(nameB)
  })

  const visit = (node: SourceNode, result: AllTodosItem[]) => {
    result.push({
      ...node.todo,
      depth: node.todo.level,
      parentId: node.parentId,
      sourceWorkspaceId: node.workspaceId,
      sourceDateKey: node.dateKey,
    })
    const children = node.children
      .map((id) => nodes.get(id))
      .filter((child): child is SourceNode => Boolean(child) && included.has(child.todo.id))
      .sort(compareSourceOrder)
    for (const child of children) visit(child, result)
  }

  return pageKeys.map((key) => {
    const roots = [...rootsByPage.get(key)!].sort(compareSourceOrder)
    const { workspaceId, dateKey } = roots[0]
    const todos: AllTodosItem[] = []
    for (const root of roots) visit(root, todos)
    return {
      workspaceId,
      workspaceName: workspaces[workspaceId]?.name ?? "",
      dateKey,
      todos,
    }
  })
}
