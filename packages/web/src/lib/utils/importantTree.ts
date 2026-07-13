import type { ImportantItemState, TodoItem, Workspace } from "@/lib/types/journal"

export type ImportanceState = "none" | "explicit" | "inherited"

export interface ImportantTodo extends TodoItem {
  depth: number
  parentId: string | null
  sourceParentId: string | null
  sourceWorkspaceId: string
  sourceDateKey: string
  importanceState: Exclude<ImportanceState, "none">
}

export interface TodoLocation {
  todo: TodoItem
  workspaceId: string
  dateKey: string
  parentId: string | null
}

interface SourceNode extends TodoLocation {
  children: string[]
}

const compareSourceOrder = (a: SourceNode, b: SourceNode) =>
  a.todo.order < b.todo.order ? -1 : a.todo.order > b.todo.order ? 1 : 0

const buildSourceNodes = (workspaces: Record<string, Workspace>) => {
  const nodes = new Map<string, SourceNode>()

  for (const workspace of Object.values(workspaces)) {
    for (const [dateKey, page] of Object.entries(workspace.pages)) {
      const sorted = [...page.todos].sort((a, b) =>
        a.order < b.order ? -1 : a.order > b.order ? 1 : 0
      )
      const stack: TodoItem[] = []

      for (const todo of sorted) {
        while (stack.length > 0 && stack[stack.length - 1].level >= todo.level) {
          stack.pop()
        }
        const parentId = stack[stack.length - 1]?.id ?? null
        nodes.set(todo.id, {
          todo,
          workspaceId: workspace.id,
          dateKey,
          parentId,
          children: [],
        })
        stack.push(todo)
      }
    }
  }

  for (const node of nodes.values()) {
    if (node.parentId) nodes.get(node.parentId)?.children.push(node.todo.id)
  }
  for (const node of nodes.values()) {
    node.children.sort((a, b) => compareSourceOrder(nodes.get(a)!, nodes.get(b)!))
  }

  return nodes
}

const hasVisiblePinnedAncestor = (
  node: SourceNode,
  nodes: Map<string, SourceNode>,
  items: Record<string, ImportantItemState>
) => {
  let parentId = node.parentId
  while (parentId) {
    const parentMeta = items[parentId]
    if (parentMeta?.isExcluded && !parentMeta.isPinned) return false
    if (parentMeta?.isPinned) return true
    parentId = nodes.get(parentId)?.parentId ?? null
  }
  return false
}

const compareImportantOrder = (
  a: SourceNode,
  b: SourceNode,
  parentId: string | null,
  items: Record<string, ImportantItemState>
) => {
  const aMeta = items[a.todo.id]
  const bMeta = items[b.todo.id]
  const aHasOrder = aMeta?.sortOrder != null && aMeta.sortParentId === parentId
  const bHasOrder = bMeta?.sortOrder != null && bMeta.sortParentId === parentId

  if (aHasOrder && bHasOrder) {
    return aMeta.sortOrder! < bMeta.sortOrder! ? -1 : aMeta.sortOrder! > bMeta.sortOrder! ? 1 : 0
  }
  if (aHasOrder) return -1
  if (bHasOrder) return 1
  return compareSourceOrder(a, b)
}

export function buildImportantTree(
  workspaces: Record<string, Workspace>,
  items: Record<string, ImportantItemState>
): { todos: ImportantTodo[]; states: Record<string, ImportanceState> } {
  const nodes = buildSourceNodes(workspaces)
  const pinnedNodes = [...nodes.values()].filter((node) => items[node.todo.id]?.isPinned)
  const roots = pinnedNodes
    .filter((node) => !hasVisiblePinnedAncestor(node, nodes, items))
    .sort((a, b) => compareImportantOrder(a, b, null, items))

  const todos: ImportantTodo[] = []
  const included = new Set<string>()

  const visit = (node: SourceNode, rootLevel: number) => {
    if (included.has(node.todo.id)) return
    const meta = items[node.todo.id]
    if (meta?.isExcluded && !meta.isPinned) return

    included.add(node.todo.id)
    todos.push({
      ...node.todo,
      depth: node.todo.level - rootLevel,
      level: node.todo.level - rootLevel,
      parentId: node.todo.level === rootLevel ? null : node.parentId,
      sourceParentId: node.parentId,
      sourceWorkspaceId: node.workspaceId,
      sourceDateKey: node.dateKey,
      importanceState: meta?.isPinned ? "explicit" : "inherited",
    })

    const children = node.children
      .map((id) => nodes.get(id))
      .filter((child): child is SourceNode => Boolean(child))
      .sort((a, b) => compareImportantOrder(a, b, node.todo.id, items))
    for (const child of children) visit(child, rootLevel)
  }

  for (const root of roots) visit(root, root.todo.level)

  const states: Record<string, ImportanceState> = {}
  for (const id of nodes.keys()) states[id] = "none"
  for (const todo of todos) states[todo.id] = todo.importanceState
  for (const [id, meta] of Object.entries(items)) {
    if (meta.isPinned && nodes.has(id)) states[id] = "explicit"
  }

  return { todos, states }
}

export function findTodoLocation(
  workspaces: Record<string, Workspace>,
  todoId: string
): TodoLocation | undefined {
  return buildSourceNodes(workspaces).get(todoId)
}
