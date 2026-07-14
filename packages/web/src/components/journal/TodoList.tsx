"use client"

/**
 * TodoList - Main component for todo list with drag-and-drop
 * Adapted from dnd-kit SortableTree
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  type PointerEvent as ReactPointerEvent,
} from "react"
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
  isSelectedTodoCopyShortcut,
  isSelectedTodoCutShortcut,
  isSelectedTodoDeleteShortcut,
  isTextEntryTarget,
} from "@/lib/utils/multiSelectShortcuts"
import {
  expandSelectionToSubtrees,
  extendSelectionByRow,
  getRowRange,
  getSweepSelection,
  serializeSelectedTodos,
} from "@/lib/utils/todoSelection"
import { FOCUS_MAIN_LIST_EVENT } from "@/lib/utils/paneShortcuts"
import { SimpleToast } from "@journal-todo/ui"
import { toast } from "sonner"
import { buildImportantTree } from "@/lib/utils/importantTree"

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
      workspaces,
      importantItems,
      toggleImportant,
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
    const [selectionFocusId, setSelectionFocusId] = useState<string | null>(null)
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
    const sweepRef = useRef<{ originId: string; active: boolean; lastOverId: string | null } | null>(null)
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
    const importanceStates = useMemo(
      () => buildImportantTree(workspaces, importantItems).states,
      [workspaces, importantItems]
    )

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
    // Selecting a row always includes its whole subtree (collapsed or not)
    const effectiveSelectedIds = useMemo(
      () => expandSelectionToSubtrees(flattenedTodos, selectedTodoSet),
      [flattenedTodos, selectedTodoSet]
    )
    const effectiveSelectedTodos = useMemo(
      () => flattenedTodos.filter((todo) => effectiveSelectedIds.has(todo.id)),
      [flattenedTodos, effectiveSelectedIds]
    )
    const visibleTodosRef = useRef(visibleTodos)
    useEffect(() => {
      visibleTodosRef.current = visibleTodos
    }, [visibleTodos])

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

    const endSweep = useCallback(() => {
      if (sweepRef.current?.active) {
        document.body.style.userSelect = ""
        document.body.style.webkitUserSelect = ""
      }
      sweepRef.current = null
    }, [])

    // Drag handlers (following official SortableTree pattern exactly)
    const handleDragStart = useCallback(({ active }: DragStartEvent) => {
      setDragActiveId(String(active.id))
      setDragOverId(String(active.id))
      setSelectedTodoIds([])
      setSelectionAnchorId(null)
      setSelectionFocusId(null)
      endSweep()
      document.body.style.setProperty("cursor", "grabbing")
    }, [endSweep])

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
      setSelectionFocusId(null)
    }, [])

    // Entering row-selection mode blurs the editor and clears any native text
    // selection, so "rows selected" and "editing text" can never coexist.
    const beginRowSelection = useCallback(() => {
      const active = document.activeElement
      if (
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLInputElement
      ) {
        // blur() and window.getSelection() do NOT clear a textarea/input's own
        // internal selectionStart/selectionEnd — collapse it explicitly, or a
        // stale in-row selection can win a native Cmd+C over our row copy.
        const pos = active.selectionEnd ?? 0
        active.setSelectionRange(pos, pos)
      }
      if (active instanceof HTMLElement && active !== document.body) {
        active.blur()
      }
      window.getSelection()?.removeAllRanges()
    }, [])

    const handleSelectTodo = useCallback(
      (todoId: string, shiftKey: boolean) => {
        if (!shiftKey) return

        beginRowSelection()

        const existingAnchor =
          selectionAnchorId && visibleTodos.some((t) => t.id === selectionAnchorId)
            ? selectionAnchorId
            : null
        // Seed the anchor from the active todo so a single shift+click selects
        // the range from the currently focused row.
        const seededAnchor =
          existingAnchor ??
          (activeTodoId && visibleTodos.some((t) => t.id === activeTodoId)
            ? activeTodoId
            : todoId)

        setSelectionAnchorId(seededAnchor)
        setSelectionFocusId(todoId)
        setSelectedTodoIds(getRowRange(visibleTodos, seededAnchor, todoId))
      },
      [activeTodoId, beginRowSelection, selectionAnchorId, visibleTodos]
    )

    const handleStartRowSelection = useCallback(
      (todoId: string) => {
        beginRowSelection()
        setSelectionAnchorId(todoId)
        setSelectionFocusId(todoId)
        setSelectedTodoIds([todoId])
      },
      [beginRowSelection]
    )

    // Drag-sweep selection: press on a row and drag into ANOTHER row to start
    // selecting rows (dragging within the same row stays native text selection).
    const handleListPointerDown = useCallback(
      (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || event.shiftKey) return
        const target = event.target as HTMLElement
        // Buttons own their gestures: drag handle (dnd-kit), checkbox, chevron, star
        if (target.closest('button, [role="checkbox"]')) return
        const originId = target
          .closest("[data-todo-id]")
          ?.getAttribute("data-todo-id")
        if (!originId) return

        sweepRef.current = { originId, active: false, lastOverId: null }

        function handlePointerMove(e: PointerEvent) {
          const sweep = sweepRef.current
          if (!sweep) {
            cleanup()
            return
          }

          const rows = visibleTodosRef.current
          let overId =
            document
              .elementFromPoint(e.clientX, e.clientY)
              ?.closest("[data-todo-id]")
              ?.getAttribute("data-todo-id") ?? null
          if (!overId && sweep.active && listRef.current) {
            // Clamp: above the list selects to the first row, below to the last
            const rect = listRef.current.getBoundingClientRect()
            if (e.clientY < rect.top) overId = rows[0]?.id ?? null
            else if (e.clientY > rect.bottom) overId = rows[rows.length - 1]?.id ?? null
            else overId = sweep.lastOverId
          }

          if (!sweep.active) {
            // Activation is strictly "pointer entered a different row" —
            // never a pixel threshold.
            if (getSweepSelection(rows, sweep.originId, overId) === null) return
            sweep.active = true
            beginRowSelection()
            document.body.style.userSelect = "none"
            document.body.style.webkitUserSelect = "none"
            setSelectionAnchorId(sweep.originId)
          }

          if (!overId) return
          sweep.lastOverId = overId
          setSelectionFocusId(overId)
          setSelectedTodoIds(getRowRange(rows, sweep.originId, overId))
        }

        function cleanup() {
          window.removeEventListener("pointermove", handlePointerMove)
          window.removeEventListener("pointerup", cleanup)
          window.removeEventListener("pointercancel", cleanup)
          window.removeEventListener("blur", cleanup)
          endSweep()
        }

        window.addEventListener("pointermove", handlePointerMove)
        window.addEventListener("pointerup", cleanup)
        window.addEventListener("pointercancel", cleanup)
        window.addEventListener("blur", cleanup)
      },
      [beginRowSelection, endSweep]
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

    const getSelectedTodoPayload = useCallback(
      () => serializeSelectedTodos(flattenedTodos, effectiveSelectedIds),
      [flattenedTodos, effectiveSelectedIds]
    )

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
          `Copied ${effectiveSelectedTodos.length} item${effectiveSelectedTodos.length > 1 ? "s" : ""}`
        )
      }
      return true
    }, [getSelectedTodoPayload, effectiveSelectedTodos.length, writeTextToClipboard])

    const copySelectedTodos = useCallback(() => {
      void copySelectedTodoText(true)
    }, [copySelectedTodoText])

    const removeSelectedTodos = useCallback((showToast = true) => {
      if (effectiveSelectedTodos.length === 0) return false

      // Bulk-deleting every todo on the page would leave nothing to type
      // into — single-item delete already guards against this (see
      // useTodoKeyboard's "todos.length > 1" checks); mirror that here by
      // leaving one fresh empty todo behind.
      const deletesEverything = effectiveSelectedTodos.length === todos.length
      const nextTodoId = getNextTodoIdAfterBulkDelete(visibleTodos, effectiveSelectedIds)

      effectiveSelectedTodos.forEach((todo) => {
        deleteTodo(todo.id)
      })

      clearSelection()

      const focusId = deletesEverything ? addTodo() : nextTodoId

      if (focusId) {
        setActiveTodoId(focusId)
        setTimeout(() => {
          focusTodo(focusId)
        }, 0)
      } else {
        setActiveTodoId(null)
      }

      if (showToast) {
        toast.success(
          `Deleted ${effectiveSelectedTodos.length} item${effectiveSelectedTodos.length > 1 ? "s" : ""}`
        )
      }

      return true
    }, [
      addTodo,
      clearSelection,
      deleteTodo,
      todos,
      effectiveSelectedIds,
      effectiveSelectedTodos,
      focusTodo,
      setActiveTodoId,
      visibleTodos,
    ])

    const cutSelectedTodos = useCallback(async () => {
      if (effectiveSelectedTodos.length === 0) return false

      const copied = await copySelectedTodoText(false)
      if (!copied) return false

      removeSelectedTodos(false)
      toast.success(`Cut ${effectiveSelectedTodos.length} item${effectiveSelectedTodos.length > 1 ? "s" : ""}`)
      return true
    }, [copySelectedTodoText, removeSelectedTodos, effectiveSelectedTodos.length])

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
      onStartRowSelection: handleStartRowSelection,
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
        if (selectedTodoIds.length === 0) return

        // Shift+Arrow extends/shrinks the row selection while row mode is on
        const arrowDirection =
          event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : null
        if (
          arrowDirection &&
          event.shiftKey &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.defaultPrevented
        ) {
          if (isTextEntryTarget(event.target)) return
          event.preventDefault()
          event.stopPropagation()
          const anchor = selectionAnchorId ?? selectedTodoIds[0]
          const focus = selectionFocusId ?? anchor
          const result = extendSelectionByRow(visibleTodos, anchor, focus, arrowDirection)
          if (result) {
            setSelectionFocusId(result.focusId)
            setSelectedTodoIds(result.selectedIds)
            document
              .querySelector(`[data-todo-id="${result.focusId}"]`)
              ?.scrollIntoView({ block: "nearest" })
          }
          return
        }

        // A row selection is active (guarded above) — it always wins over any
        // stray native text selection, so no hasNativeTextSelection check here.
        if (isSelectedTodoCopyShortcut(event, shortcutPlatform)) {
          event.preventDefault()
          event.stopPropagation()
          void copySelectedTodoText(true)
          return
        }

        if (isSelectedTodoCutShortcut(event, shortcutPlatform)) {
          event.preventDefault()
          event.stopPropagation()
          void cutSelectedTodos()
          return
        }

        if (isSelectedTodoDeleteShortcut(event, shortcutPlatform)) {
          // Typing in a text field must never bulk-delete rows
          if (isTextEntryTarget(event.target)) return
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
      selectedTodoIds,
      selectionAnchorId,
      selectionFocusId,
      shortcutPlatform,
      visibleTodos,
    ])

    // Escape to clear selection
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape" && selectedTodoIds.length > 0) {
          event.preventDefault()
          endSweep()
          clearSelection()
        }
      }

      window.addEventListener("keydown", handleEscape)
      return () => window.removeEventListener("keydown", handleEscape)
    }, [selectedTodoIds.length, clearSelection, endSweep])

    // Cmd/Ctrl+Shift+I hands focus back to the main list
    useEffect(() => {
      const handleFocusRequest = () => {
        const targetId =
          activeTodoId && visibleTodos.some((t) => t.id === activeTodoId)
            ? activeTodoId
            : visibleTodos[0]?.id
        if (!targetId) return
        setActiveTodoId(targetId)
        focusTodo(targetId, "end")
      }

      window.addEventListener(FOCUS_MAIN_LIST_EVENT, handleFocusRequest)
      return () => window.removeEventListener(FOCUS_MAIN_LIST_EVENT, handleFocusRequest)
    }, [activeTodoId, visibleTodos, focusTodo])

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
          <div ref={setRefs} className="space-y-0" onPointerDown={handleListPointerDown}>
            {visibleTodos.map((todo) => (
              <SortableTodoItem
                key={todo.id}
                todo={todo}
                // Key: active item uses projected.depth, others use their own depth
                depth={todo.id === dragActiveId && projected ? projected.depth : todo.depth}
                isActive={activeTodoId === todo.id}
                isSelected={effectiveSelectedIds.has(todo.id)}
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
                importanceState={importanceStates[todo.id] ?? "none"}
                onToggleImportant={toggleImportant}
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
