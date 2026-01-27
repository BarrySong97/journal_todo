"use client"

/**
 * SortableTodoItem - Wrapper component for TodoItem with sortable functionality
 * Adapted from dnd-kit SortableTreeItem
 */

import type { CSSProperties, KeyboardEvent } from "react"
import { useSortable, type AnimateLayoutChanges } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TodoItem } from "./TodoItem"
import type { FlattenedTodo } from "./todoTreeUtils"

const animateLayoutChanges: AnimateLayoutChanges = ({ isSorting, wasDragging }) =>
  isSorting || wasDragging ? false : true

interface SortableTodoItemProps {
  todo: FlattenedTodo
  depth: number
  isActive: boolean
  isSelected: boolean
  isParent: boolean
  isCollapsed: boolean
  indicator?: boolean
  clone?: boolean
  childCount?: number
  onTextChange: (todoId: string, text: string) => void
  onToggle: (todoId: string) => void
  onToggleCollapse?: (todoId: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, todoId: string) => void
  onFocus: (todoId: string) => void
  inputRef: (todoId: string, element: HTMLTextAreaElement | null) => void
}

export function SortableTodoItem({
  todo,
  depth,
  isActive,
  isSelected,
  isParent,
  isCollapsed,
  indicator = true,
  clone = false,
  childCount,
  onTextChange,
  onToggle,
  onToggleCollapse,
  onKeyDown,
  onFocus,
  inputRef,
}: SortableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting,
  } = useSortable({
    id: todo.id,
    animateLayoutChanges,
  })

  // Use CSS.Translate (not Transform) to avoid scale issues
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <TodoItem
      ref={setNodeRef}
      todo={todo}
      depth={depth}
      style={style}
      ghost={isDragging}
      clone={clone}
      childCount={childCount}
      indicator={indicator}
      isActive={isActive}
      isSelected={isSelected}
      isParent={isParent}
      isCollapsed={isCollapsed}
      disableInteraction={isSorting}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      onTextChange={onTextChange}
      onToggle={onToggle}
      onToggleCollapse={onToggleCollapse}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      inputRef={inputRef}
    />
  )
}
