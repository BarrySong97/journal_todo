"use client"

/**
 * TodoList - Main component for todo list with drag-and-drop
 * Adapted from dnd-kit SortableTree
 */

import { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from "react"
import { createPortal } from "react-dom"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { SortableTodoItem } from "./SortableTodoItem"
import { TodoItem } from "./TodoItem"
import {
  flattenTodos,
  removeChildrenOf,
  getParentIds,
  getVisibleTodos,
  getProjection,
  getChildCount,
  INDENTATION_WIDTH,
} from "./todoTreeUtils"
import { useJournal } from "@/hooks/useJournal"
import { useTodoFocus } from "@/hooks/useTodoFocus"
import { useTodoKeyboard } from "@/hooks/useTodoKeyboard"
import { Toast } from "@/components/ui/toast"

interface SelectionRect {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

interface TodoListProps {
  selectionRect?: SelectionRect | null
  onClearSelection?: () => void
}

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

export const TodoList = forwardRef<HTMLDivElement, TodoListProps>(
  function TodoList({ selectionRect, onClearSelection }, ref) {
    const {
      currentPage,
      currentWorkspaceId,
      currentDateKey,
      getOrCreatePage,
      updateTodoText,
      toggleTodo,
      addTodo,
      deleteTodo,
      moveTodo,
      reorderTodos,
      updateTodoLevel,
    } = useJournal()

    // Ensure page exists - create if needed (in useEffect to avoid render-time state updates)
    useEffect(() => {
      if (!currentPage) {
        getOrCreatePage(currentDateKey)
      }
    }, [currentPage, currentDateKey, getOrCreatePage])

    // UI state
    const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
    const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([])
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
    const [toastMessage, setToastMessage] = useState("")
    const [toastOpen, setToastOpen] = useState(false)

    // Drag state (following official SortableTree pattern)
    const [dragActiveId, setDragActiveId] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [offsetLeft, setOffsetLeft] = useState(0)

    const { setTodoRef, focusTodo } = useTodoFocus()
    const listRef = useRef<HTMLDivElement | null>(null)
    const prevWorkspaceIdRef = useRef<string | null>(null)
    const prevDateRef = useRef<string | null>(null)
    const selectedTodoSet = useMemo(() => new Set(selectedTodoIds), [selectedTodoIds])

    // dnd-kit sensors
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    )

    // Get todos safely (empty array if page doesn't exist yet)
    const todos = currentPage?.todos ?? []

    // Flatten todos and compute parent IDs
    const flattenedTodos = useMemo(() => flattenTodos(todos), [todos])
    const parentIds = useMemo(() => getParentIds(todos), [todos])

    // Compute visible todos (collapsed + hide children of dragged item)
    // Following official SortableTree pattern exactly
    const visibleTodos = useMemo(() => {
      const visibleItems = getVisibleTodos(flattenedTodos, collapsedIds)

      // During drag, also hide children of the dragged item
      if (dragActiveId !== null) {
        return removeChildrenOf(visibleItems, [dragActiveId])
      }

      return visibleItems
    }, [flattenedTodos, collapsedIds, dragActiveId])

    // Calculate projection using official algorithm
    const projected = useMemo(() => {
      if (!dragActiveId || !dragOverId) return null
      return getProjection(visibleTodos, dragActiveId, dragOverId, offsetLeft, INDENTATION_WIDTH)
    }, [dragActiveId, dragOverId, offsetLeft, visibleTodos])

    // Get sorted IDs for SortableContext
    const sortedIds = useMemo(() => visibleTodos.map((todo) => todo.id), [visibleTodos])

    // Get active item for DragOverlay
    const activeItem = dragActiveId
      ? flattenedTodos.find((todo) => todo.id === dragActiveId)
      : null

    // Handlers
    const handleToggleCollapse = useCallback((todoId: string) => {
      setCollapsedIds((prev) => {
        const next = new Set(prev)
        if (next.has(todoId)) {
          next.delete(todoId)
        } else {
          next.add(todoId)
        }
        return next
      })
    }, [])

    // Drag handlers (following official SortableTree pattern exactly)
    const handleDragStart = useCallback(({ active }: DragStartEvent) => {
      setDragActiveId(String(active.id))
      setDragOverId(String(active.id))
      setSelectedTodoIds([])
      document.body.style.setProperty("cursor", "grabbing")
    }, [])

    const handleDragMove = useCallback(({ delta }: DragMoveEvent) => {
      setOffsetLeft(delta.x)
    }, [])

    const handleDragOver = useCallback(({ over }: DragOverEvent) => {
      setDragOverId(over?.id ? String(over.id) : null)
    }, [])

    const handleDragEnd = useCallback(
      ({ active, over }: DragEndEvent) => {
        if (projected && over) {
          const activeId = String(active.id)
          const overId = String(over.id)
          const { depth } = projected

          const visibleIds = visibleTodos.map((todo) => todo.id)
          const activeIndex = visibleIds.indexOf(activeId)
          const overIndex = visibleIds.indexOf(overId)
          if (activeIndex !== -1 && overIndex !== -1) {
            const reordered = arrayMove(visibleIds, activeIndex, overIndex)
            const newIndex = reordered.indexOf(activeId)
            const beforeId = reordered[newIndex - 1] ?? null
            const afterId = reordered[newIndex + 1] ?? null
            reorderTodos(activeId, beforeId, afterId, depth)
          }
        }

        resetDragState()
      },
      [reorderTodos, projected, visibleTodos]
    )

    const handleDragCancel = useCallback(() => {
      resetDragState()
    }, [])

    const resetDragState = () => {
      setDragActiveId(null)
      setDragOverId(null)
      setOffsetLeft(0)
      document.body.style.setProperty("cursor", "")
    }

    const clearSelection = useCallback(() => {
      setSelectedTodoIds([])
      onClearSelection?.()
    }, [onClearSelection])

    const updateSelectionFromRect = useCallback(
      (rect: { left: number; right: number; top: number; bottom: number }) => {
        if (!listRef.current) return
        const elements = listRef.current.querySelectorAll<HTMLElement>("[data-todo-id]")
        const hits = new Set<string>()

        elements.forEach((element) => {
          const bounds = element.getBoundingClientRect()
          const intersects =
            bounds.right >= rect.left &&
            bounds.left <= rect.right &&
            bounds.bottom >= rect.top &&
            bounds.top <= rect.bottom

          if (intersects) {
            const id = element.dataset.todoId
            if (id) hits.add(id)
          }
        })

        const ordered = visibleTodos
          .filter((todo) => hits.has(todo.id))
          .map((todo) => todo.id)

        setSelectedTodoIds(ordered)
      },
      [visibleTodos]
    )

    // Update selection when selectionRect changes
    useEffect(() => {
      if (selectionRect) {
        updateSelectionFromRect(selectionRect)
      }
    }, [selectionRect, updateSelectionFromRect])

    const copySelectedTodos = useCallback(() => {
      const INDENT = "  "
      const texts = visibleTodos
        .filter((todo) => selectedTodoSet.has(todo.id))
        .map((todo) => `${INDENT.repeat(todo.level)}${todo.text}`)
        .filter((text) => text.trim().length > 0)

      if (texts.length === 0) return

      const payload = texts.join("\n")
      const writeText = async () => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(payload)
            return
          }
        } catch {
          // fallback
        }

        const textarea = document.createElement("textarea")
        textarea.value = payload
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }

      void writeText()
    }, [visibleTodos, selectedTodoSet])

    // Keyboard handling
    const { handleKeyDown } = useTodoKeyboard({
      todos: visibleTodos,
      activeTodoId,
      focusTodo,
      addTodo,
      updateTodoText,
      deleteTodo,
      moveTodo,
      updateTodoLevel,
      setActiveTodoId,
      selectedTodoIds,
      copySelectedTodos,
    })

    // Focus management
    const currentDate = currentPage?.date
    useEffect(() => {
      if (!currentDate || prevDateRef.current === currentDate) return
      prevDateRef.current = currentDate
      if (todos.length === 0) return
      const firstTodo = todos[0]
      setTimeout(() => {
        setActiveTodoId(firstTodo.id)
        focusTodo(firstTodo.id)
      }, 0)
    }, [currentDate, todos, focusTodo])

    useEffect(() => {
      const prevWorkspaceId = prevWorkspaceIdRef.current
      if (prevWorkspaceId === currentWorkspaceId) return
      prevWorkspaceIdRef.current = currentWorkspaceId

      if (todos.length === 0) return
      const firstTodo = todos[0]
      clearSelection()
      setActiveTodoId(firstTodo.id)
      setTimeout(() => {
        focusTodo(firstTodo.id)
      }, 0)
    }, [currentWorkspaceId, todos, focusTodo, clearSelection])

    // Event handlers for TodoItem
    const handleTextChange = (todoId: string, text: string) => {
      updateTodoText(todoId, text)
    }

    const handleToggle = (todoId: string) => {
      toggleTodo(todoId)
    }

    const handleFocus = (todoId: string) => {
      setActiveTodoId(todoId)
      clearSelection()
    }

    // Global keyboard handlers
    useEffect(() => {
      const handleCopy = (event: KeyboardEvent) => {
        if (event.defaultPrevented) return
        if (!event.ctrlKey && !event.metaKey) return
        if (event.key.toLowerCase() !== "c") return
        if (selectedTodoIds.length === 0) return

        if (document.activeElement instanceof HTMLTextAreaElement) {
          const input = document.activeElement
          if (input.selectionStart !== input.selectionEnd) return
        }

        const selectionText = window.getSelection()?.toString() ?? ""
        if (selectionText.length > 0) return

        event.preventDefault()
        copySelectedTodos()
      }

      window.addEventListener("keydown", handleCopy)
      return () => window.removeEventListener("keydown", handleCopy)
    }, [selectedTodoIds.length, copySelectedTodos])

    useEffect(() => {
      const handleToggleTodo = (event: Event) => {
        const customEvent = event as CustomEvent<{ todoId: string }>
        if (customEvent.detail?.todoId) {
          const success = toggleTodo(customEvent.detail.todoId)
          if (!success) {
            setToastMessage("Please complete all sub-todos first")
            setToastOpen(true)
          }
        }
      }

      window.addEventListener("toggle-todo", handleToggleTodo)
      return () => window.removeEventListener("toggle-todo", handleToggleTodo)
    }, [toggleTodo])

    useEffect(() => {
      if (!toastOpen) return
      const timer = window.setTimeout(() => {
        setToastOpen(false)
      }, 2500)
      return () => window.clearTimeout(timer)
    }, [toastOpen])

    // Combine refs
    const setRefs = useCallback(
      (element: HTMLDivElement | null) => {
        listRef.current = element
        if (typeof ref === "function") {
          ref(element)
        } else if (ref) {
          ref.current = element
        }
      },
      [ref]
    )

    if (todos.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          <p>No todos for this day yet.</p>
        </div>
      )
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={measuring}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
          <div ref={setRefs} className="space-y-0">
            {visibleTodos.map((todo) => (
              <SortableTodoItem
                key={todo.id}
                todo={todo}
                // Key: active item uses projected.depth, others use their own depth
                depth={todo.id === dragActiveId && projected ? projected.depth : todo.depth}
                isActive={activeTodoId === todo.id}
                isSelected={selectedTodoSet.has(todo.id)}
                isParent={parentIds.has(todo.id)}
                isCollapsed={collapsedIds.has(todo.id)}
                indicator={true}
                onTextChange={handleTextChange}
                onToggle={handleToggle}
                onToggleCollapse={handleToggleCollapse}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                inputRef={setTodoRef}
              />
            ))}
            {/* DragOverlay - shows clone of dragged item */}
            {createPortal(
              <DragOverlay>
                {dragActiveId && activeItem ? (
                  <TodoItem
                    todo={activeItem}
                    depth={activeItem.depth}
                    clone={true}
                    childCount={getChildCount(flattenedTodos, dragActiveId) + 1}
                    isActive={false}
                    isSelected={false}
                    isParent={parentIds.has(dragActiveId)}
                    isCollapsed={false}
                    onTextChange={() => {}}
                    onToggle={() => {}}
                    onKeyDown={() => {}}
                    onFocus={() => {}}
                    inputRef={() => {}}
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )}
            <Toast open={toastOpen} message={toastMessage} />
          </div>
        </SortableContext>
      </DndContext>
    )
  }
)
