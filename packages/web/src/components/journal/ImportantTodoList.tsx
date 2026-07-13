"use client"

import { useMemo, useState, type KeyboardEvent } from "react"
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { toast } from "sonner"
import { useJournal } from "@/hooks/useJournal"
import { buildImportantTree } from "@/lib/utils/importantTree"
import { getVisibleTodos } from "./todoTreeUtils"
import { SortableTodoItem } from "./SortableTodoItem"

const COLLAPSED_STORAGE_KEY = "journal-important-collapsed-todos"

export function ImportantTodoList() {
  const {
    workspaces,
    importantItems,
    reorderImportant,
    updateTodoTextById,
    toggleTodoById,
    removeFromImportant,
    restoreImportantItem,
  } = useJournal()
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? "[]") as string[])
    } catch {
      return new Set()
    }
  })

  const allTodos = useMemo(
    () => buildImportantTree(workspaces, importantItems).todos,
    [workspaces, importantItems]
  )
  const visibleTodos = useMemo(
    () => getVisibleTodos(allTodos, collapsedIds),
    [allTodos, collapsedIds]
  )
  const parentIds = useMemo(() => {
    const ids = new Set<string>()
    for (const todo of allTodos) {
      if (todo.parentId) ids.add(todo.parentId)
    }
    return ids
  }, [allTodos])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const toggleCollapse = (todoId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(todoId)) next.delete(todoId)
      else next.add(todoId)
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // Local preference persistence is best-effort.
      }
      return next
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      reorderImportant(String(active.id), String(over.id))
    }
  }

  const handleRemove = (todoId: string) => {
    const previous = removeFromImportant(todoId)
    toast("Removed from Important", {
      action: {
        label: "Undo",
        onClick: () => restoreImportantItem(todoId, previous),
      },
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") event.preventDefault()
  }

  if (allTodos.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-muted-foreground">
        Star a task to keep it here.
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={visibleTodos.map((todo) => todo.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-0 px-2 pb-8">
          {visibleTodos.map((todo) => (
            <SortableTodoItem
              key={todo.id}
              todo={todo}
              depth={todo.depth}
              isActive={activeTodoId === todo.id}
              isSelected={false}
              isParent={parentIds.has(todo.id)}
              isCollapsed={collapsedIds.has(todo.id)}
              onTextChange={updateTodoTextById}
              onToggle={toggleTodoById}
              onToggleCollapse={toggleCollapse}
              onKeyDown={handleKeyDown}
              onPasteTodo={() => false}
              onFocus={setActiveTodoId}
              inputRef={() => {}}
              importanceState={todo.importanceState}
              onRemoveImportant={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
