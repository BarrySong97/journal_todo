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
import {
  getNextTodoIdAfterBulkDelete,
  getTodoShortcutPlatform,
  hasDocumentTextSelection,
  hasNativeTextSelection,
  isSelectedTodoCopyShortcut,
  isSelectedTodoCutShortcut,
  isSelectedTodoDeleteShortcut,
} from "@/lib/utils/multiSelectShortcuts"
import { SimpleToast } from "@journal-todo/ui"
import { toast } from "sonner"

interface TodoListProps {}

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

const COLLAPSED_STORAGE_KEY = "journal-collapsed-todos"

export const TodoList = forwardRef<HTMLDivElement, TodoListProps>(
  function TodoList(_props, ref) {
    const {
      currentPage,
      currentWorkspaceId,
      currentDateKey,
      getOrCreatePage,
      updateTodoText,
      pasteTodoText,
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
    const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
      try {
        const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY)
        if (stored) {
          return new Set(JSON.parse(stored) as string[])
        }
      } catch { /* ignore */ }
      return new Set()
    })
    useEffect(() => {
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...collapsedIds]))
      } catch { /* ignore */ }
    }, [collapsedIds])

    const [toastMessage, setToastMessage] = useState("")
    const [toastOpen, setToastOpen] = useState(false)
    const shortcutPlatform = getTodoShortcutPlatform()

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
    const selectedVisibleTodos = useMemo(
      () => visibleTodos.filter((todo) => selectedTodoSet.has(todo.id)),
      [visibleTodos, selectedTodoSet]
    )

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
      setSelectionAnchorId(null)
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
      setSelectionAnchorId(null)
    }, [])

    const handleSelectTodo = useCallback(
      (todoId: string, shiftKey: boolean) => {
        if (!shiftKey) return

        if (selectedTodoIds.length === 0 || selectionAnchorId === null) {
          setSelectionAnchorId(todoId)
          setSelectedTodoIds([todoId])
        } else {
          const anchorIndex = visibleTodos.findIndex((t) => t.id === selectionAnchorId)
          const clickedIndex = visibleTodos.findIndex((t) => t.id === todoId)

          if (anchorIndex === -1 || clickedIndex === -1) {
            setSelectionAnchorId(todoId)
            setSelectedTodoIds([todoId])
            return
          }

          const start = Math.min(anchorIndex, clickedIndex)
          const end = Math.max(anchorIndex, clickedIndex)
          const rangeIds = visibleTodos.slice(start, end + 1).map((t) => t.id)
          setSelectedTodoIds(rangeIds)
        }
      },
      [selectedTodoIds, selectionAnchorId, visibleTodos]
    )

    const writeTextToClipboard = useCallback(async (payload: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(payload)
          return true
        }
      } catch {
        // Fall back to execCommand below.
      }

      const textarea = document.createElement("textarea")
      textarea.value = payload
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      const copied = document.execCommand("copy")
      document.body.removeChild(textarea)
      return copied
    }, [])

    const getSelectedTodoPayload = useCallback(() => {
      const INDENT = "  "
      const texts = selectedVisibleTodos
        .map((todo) => `${INDENT.repeat(todo.level)}${todo.text}`)
        .filter((text) => text.trim().length > 0)

      if (texts.length === 0) return null

      return texts.join("\n")
    }, [selectedVisibleTodos])

    const copySelectedTodoText = useCallback(async (showToast = true) => {
      const payload = getSelectedTodoPayload()
      if (!payload) return false

      const copied = await writeTextToClipboard(payload)
      if (!copied) {
        toast.error("Failed to copy selected items")
        return false
      }

      if (showToast) {
        toast.success(
          `Copied ${selectedVisibleTodos.length} item${selectedVisibleTodos.length > 1 ? "s" : ""}`
        )
      }
      return true
    }, [getSelectedTodoPayload, selectedVisibleTodos.length, writeTextToClipboard])

    const copySelectedTodos = useCallback(() => {
      void copySelectedTodoText(true)
    }, [copySelectedTodoText])

    const removeSelectedTodos = useCallback((showToast = true) => {
      if (selectedVisibleTodos.length === 0) return false

      const selectedIds = new Set(selectedVisibleTodos.map((todo) => todo.id))
      const nextTodoId = getNextTodoIdAfterBulkDelete(visibleTodos, selectedIds)

      selectedVisibleTodos.forEach((todo) => {
        deleteTodo(todo.id)
      })

      clearSelection()

      if (nextTodoId) {
        setActiveTodoId(nextTodoId)
        setTimeout(() => {
          focusTodo(nextTodoId)
        }, 0)
      } else {
        setActiveTodoId(null)
      }

      if (showToast) {
        toast.success(
          `Deleted ${selectedVisibleTodos.length} item${selectedVisibleTodos.length > 1 ? "s" : ""}`
        )
      }

      return true
    }, [
      clearSelection,
      deleteTodo,
      focusTodo,
      selectedVisibleTodos,
      setActiveTodoId,
      visibleTodos,
    ])

    const cutSelectedTodos = useCallback(async () => {
      if (selectedVisibleTodos.length === 0) return false

      const copied = await copySelectedTodoText(false)
      if (!copied) return false

      removeSelectedTodos(false)
      toast.success(`Cut ${selectedVisibleTodos.length} item${selectedVisibleTodos.length > 1 ? "s" : ""}`)
      return true
    }, [copySelectedTodoText, removeSelectedTodos, selectedVisibleTodos.length])

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
      parentIds,
      collapsedIds,
      allTodos: flattenedTodos,
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

    const handlePasteTodo = (
      todoId: string,
      text: string,
      selectionStart: number,
      selectionEnd: number
    ) => pasteTodoText(todoId, text, selectionStart, selectionEnd)

    const handleToggle = (todoId: string) => {
      toggleTodo(todoId)
    }

    const handleFocus = (todoId: string) => {
      setActiveTodoId(todoId)
      clearSelection()
    }

    useEffect(() => {
      const handleMultiSelectShortcut = (event: KeyboardEvent) => {
        if (selectedVisibleTodos.length === 0) return

        const hasTextSelection =
          hasNativeTextSelection(event.target) || hasDocumentTextSelection()

        if (isSelectedTodoCopyShortcut(event, shortcutPlatform)) {
          if (hasTextSelection) return
          event.preventDefault()
          event.stopPropagation()
          void copySelectedTodoText(true)
          return
        }

        if (isSelectedTodoCutShortcut(event, shortcutPlatform)) {
          if (hasTextSelection) return
          event.preventDefault()
          event.stopPropagation()
          void cutSelectedTodos()
          return
        }

        if (isSelectedTodoDeleteShortcut(event, shortcutPlatform)) {
          if (hasTextSelection) return
          event.preventDefault()
          event.stopPropagation()
          removeSelectedTodos(true)
        }
      }

      window.addEventListener("keydown", handleMultiSelectShortcut, true)
      return () => window.removeEventListener("keydown", handleMultiSelectShortcut, true)
    }, [
      copySelectedTodoText,
      cutSelectedTodos,
      removeSelectedTodos,
      selectedVisibleTodos.length,
      shortcutPlatform,
    ])

    // Escape to clear selection
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape" && selectedTodoIds.length > 0) {
          event.preventDefault()
          clearSelection()
        }
      }

      window.addEventListener("keydown", handleEscape)
      return () => window.removeEventListener("keydown", handleEscape)
    }, [selectedTodoIds.length, clearSelection])

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
                onPasteTodo={handlePasteTodo}
                onFocus={handleFocus}
                onSelect={handleSelectTodo}
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
                    onPasteTodo={() => false}
                    onFocus={() => {}}
                    inputRef={() => {}}
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )}
      <SimpleToast open={toastOpen} message={toastMessage} />
          </div>
        </SortableContext>
      </DndContext>
    )
  }
)
