/**
 * Tree utilities for TodoList drag-and-drop
 * Adapted from dnd-kit SortableTree example
 */

import { arrayMove } from "@dnd-kit/sortable"
import type { TodoItem } from "@/lib/types/journal"

export interface FlattenedTodo extends TodoItem {
  parentId: string | null
  depth: number
}

const INDENTATION_WIDTH = 24
const MAX_DEPTH = 3

/**
 * Convert flat todos array to flattened items with parentId
 */
export function flattenTodos(todos: TodoItem[]): FlattenedTodo[] {
  const result: FlattenedTodo[] = []
  const parentStack: { id: string; depth: number }[] = []

  for (const todo of todos) {
    // Pop parents that are at same or deeper level
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].depth >= todo.level) {
      parentStack.pop()
    }

    const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null

    result.push({
      ...todo,
      depth: todo.level,
      parentId,
    })

    parentStack.push({ id: todo.id, depth: todo.level })
  }

  return result
}

/**
 * Remove children of specified ids (used during drag to hide children of dragged item)
 */
export function removeChildrenOf(items: FlattenedTodo[], ids: string[]): FlattenedTodo[] {
  const excludeParentIds = new Set(ids)

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.has(item.parentId)) {
      excludeParentIds.add(item.id)
      return false
    }
    return true
  })
}

/**
 * Get IDs of todos that have children
 */
export function getParentIds(todos: TodoItem[]): Set<string> {
  const parentIds = new Set<string>()
  for (let i = 0; i < todos.length - 1; i++) {
    if (todos[i + 1].level > todos[i].level) {
      parentIds.add(todos[i].id)
    }
  }
  return parentIds
}

/**
 * Get visible todos based on collapsed state
 */
export function getVisibleTodos(
  items: FlattenedTodo[],
  collapsedIds: Set<string>
): FlattenedTodo[] {
  const excludeParentIds = new Set<string>()

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.has(item.parentId)) {
      excludeParentIds.add(item.id)
      return false
    }

    if (collapsedIds.has(item.id)) {
      excludeParentIds.add(item.id)
    }

    return true
  })
}

/**
 * Calculate projection for drag operation
 * Adapted from dnd-kit SortableTree utilities
 */
export function getProjection(
  items: FlattenedTodo[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number = INDENTATION_WIDTH
): { depth: number; parentId: string | null } | null {
  const overItemIndex = items.findIndex((item) => item.id === overId)
  const activeItemIndex = items.findIndex((item) => item.id === activeId)

  if (overItemIndex === -1 || activeItemIndex === -1) return null

  const activeItem = items[activeItemIndex]

  // Simulate the move using arrayMove
  const newItems = arrayMove(items, activeItemIndex, overItemIndex)
  const previousItem = newItems[overItemIndex - 1]
  const nextItem = newItems[overItemIndex + 1]

  // Calculate projected depth based on drag offset
  const dragDepth = Math.round(dragOffset / indentationWidth)
  const projectedDepth = activeItem.depth + dragDepth

  // Calculate min/max depth constraints
  const maxDepth = previousItem ? Math.min(MAX_DEPTH, previousItem.depth + 1) : 0
  const minDepth = nextItem ? nextItem.depth : 0

  // Clamp depth to valid range
  let depth = projectedDepth
  if (depth > maxDepth) {
    depth = maxDepth
  } else if (depth < minDepth) {
    depth = minDepth
  }
  depth = Math.max(0, Math.min(MAX_DEPTH, depth))

  // Calculate parentId based on depth
  const parentId = getParentIdForDepth(depth, previousItem, newItems, overItemIndex)

  return { depth, parentId }
}

function getParentIdForDepth(
  depth: number,
  previousItem: FlattenedTodo | undefined,
  items: FlattenedTodo[],
  overItemIndex: number
): string | null {
  if (depth === 0 || !previousItem) {
    return null
  }

  if (depth === previousItem.depth) {
    return previousItem.parentId
  }

  if (depth > previousItem.depth) {
    return previousItem.id
  }

  const newParent = items
    .slice(0, overItemIndex)
    .reverse()
    .find((item) => item.depth === depth)?.parentId

  return newParent ?? null
}

/**
 * Count children of a todo
 */
export function getChildCount(items: FlattenedTodo[], id: string): number {
  const startIndex = items.findIndex((item) => item.id === id)
  if (startIndex === -1) return 0

  const startDepth = items[startIndex].depth
  let count = 0

  for (let i = startIndex + 1; i < items.length; i++) {
    if (items[i].depth > startDepth) {
      count++
    } else {
      break
    }
  }

  return count
}

export { INDENTATION_WIDTH, MAX_DEPTH }
