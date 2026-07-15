"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { toast } from "sonner"
import { useJournal } from "@/hooks/useJournal"
import { useTodoFocus } from "@/hooks/useTodoFocus"
import { buildImportantTree } from "@/lib/utils/importantTree"
import {
  getTodoShortcutPlatform,
  isSelectedTodoCopyShortcut,
  isTextEntryTarget,
} from "@/lib/utils/multiSelectShortcuts"
import { FOCUS_IMPORTANT_LIST_EVENT } from "@/lib/utils/paneShortcuts"
import {
  expandSelectionToSubtrees,
  extendSelectionByRow,
  getRowRange,
  getSweepSelection,
  serializeSelectedTodos,
} from "@/lib/utils/todoSelection"
import { getVisibleTodos } from "./todoTreeUtils"
import { SortableTodoItem } from "./SortableTodoItem"

const COLLAPSED_STORAGE_KEY = "journal-important-collapsed-todos"

export function ImportantTodoList() {
  const {
    workspaces,
    importantItems,
    reorderImportant,
    moveImportant,
    updateTodoTextById,
    toggleTodoById,
    removeFromImportant,
    restoreImportantItem,
  } = useJournal()
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [selectionFocusId, setSelectionFocusId] = useState<string | null>(null)
  const { setTodoRef, focusTodo } = useTodoFocus()
  const listRef = useRef<HTMLDivElement | null>(null)
  const sweepRef = useRef<{ originId: string; active: boolean; lastOverId: string | null } | null>(null)
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
  const selectedTodoSet = useMemo(() => new Set(selectedTodoIds), [selectedTodoIds])
  const effectiveSelectedIds = useMemo(
    () => expandSelectionToSubtrees(allTodos, selectedTodoSet),
    [allTodos, selectedTodoSet]
  )
  const effectiveSelectedTodos = useMemo(
    () => allTodos.filter((todo) => effectiveSelectedIds.has(todo.id)),
    [allTodos, effectiveSelectedIds]
  )
  const visibleTodosRef = useRef(visibleTodos)
  useEffect(() => {
    visibleTodosRef.current = visibleTodos
  }, [visibleTodos])
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

  const clearSelection = useCallback(() => {
    setSelectedTodoIds([])
    setSelectionAnchorId(null)
    setSelectionFocusId(null)
  }, [])

  const endSweep = useCallback(() => {
    if (sweepRef.current?.active) {
      document.body.style.userSelect = ""
      document.body.style.webkitUserSelect = ""
    }
    sweepRef.current = null
  }, [])

  const beginRowSelection = useCallback(() => {
    const active = document.activeElement
    if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
      const pos = active.selectionEnd ?? 0
      active.setSelectionRange(pos, pos)
    }
    if (active instanceof HTMLElement && active !== document.body) active.blur()
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleSelectTodo = useCallback(
    (todoId: string, shiftKey: boolean) => {
      if (!shiftKey) return

      beginRowSelection()
      const existingAnchor =
        selectionAnchorId && visibleTodos.some((todo) => todo.id === selectionAnchorId)
          ? selectionAnchorId
          : null
      const seededAnchor =
        existingAnchor ??
        (activeTodoId && visibleTodos.some((todo) => todo.id === activeTodoId)
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

  const handleListPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || event.shiftKey) return
      const target = event.target as HTMLElement
      if (target.closest('button, [role="checkbox"]')) return
      const originId = target.closest("[data-todo-id]")?.getAttribute("data-todo-id")
      if (!originId) return

      sweepRef.current = { originId, active: false, lastOverId: null }

      function handlePointerMove(pointerEvent: PointerEvent) {
        const sweep = sweepRef.current
        if (!sweep) {
          cleanup()
          return
        }

        const rows = visibleTodosRef.current
        let overId =
          document
            .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
            ?.closest("[data-todo-id]")
            ?.getAttribute("data-todo-id") ?? null
        if (!overId && sweep.active && listRef.current) {
          const rect = listRef.current.getBoundingClientRect()
          if (pointerEvent.clientY < rect.top) overId = rows[0]?.id ?? null
          else if (pointerEvent.clientY > rect.bottom) overId = rows[rows.length - 1]?.id ?? null
          else overId = sweep.lastOverId
        }

        if (!sweep.active) {
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

  const copySelectedTodos = useCallback(async () => {
    const payload = serializeSelectedTodos(allTodos, effectiveSelectedIds)
    if (!payload) return

    const copied = await writeTextToClipboard(payload)
    if (!copied) {
      toast.error("Failed to copy selected items")
      return
    }

    toast.success(
      `Copied ${effectiveSelectedTodos.length} item${effectiveSelectedTodos.length > 1 ? "s" : ""}`
    )
  }, [allTodos, effectiveSelectedIds, effectiveSelectedTodos.length, writeTextToClipboard])

  const handleDragStart = (_event: DragStartEvent) => {
    clearSelection()
    endSweep()
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      reorderImportant(String(active.id), String(over.id))
    }
  }

  const handleRemove = (todoId: string) => {
    clearSelection()
    const previous = removeFromImportant(todoId)
    toast("Removed from Important", {
      action: {
        label: "Undo",
        onClick: () => restoreImportantItem(todoId, previous),
      },
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, todoId: string) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? "up" : "down"

      if (event.altKey && event.shiftKey) {
        // Alt+Shift+↑/↓: move the item among its siblings (same as main list)
        event.preventDefault()
        if (event.repeat) return
        moveImportant(todoId, direction)
        return
      }

      if (event.shiftKey) {
        if (event.ctrlKey || event.metaKey) return
        const input = event.currentTarget
        const isAtBoundary =
          direction === "up"
            ? input.selectionStart === 0
            : input.selectionEnd === input.value.length
        if (isAtBoundary) {
          event.preventDefault()
          handleStartRowSelection(todoId)
        }
        return
      }

      // Plain ↑/↓: move focus between visible items
      event.preventDefault()
      const index = visibleTodos.findIndex((todo) => todo.id === todoId)
      const next = visibleTodos[direction === "up" ? index - 1 : index + 1]
      if (next) {
        setActiveTodoId(next.id)
        focusTodo(next.id)
      }
      return
    }
    if (event.key === "Enter") event.preventDefault()
  }

  const handleFocus = (todoId: string) => {
    setActiveTodoId(todoId)
    clearSelection()
  }

  useEffect(() => {
    const shortcutPlatform = getTodoShortcutPlatform()
    const handleSelectionShortcut = (event: globalThis.KeyboardEvent) => {
      if (selectedTodoIds.length === 0) return

      const direction =
        event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : null
      if (
        direction &&
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
        const result = extendSelectionByRow(visibleTodos, anchor, focus, direction)
        if (result) {
          setSelectionFocusId(result.focusId)
          setSelectedTodoIds(result.selectedIds)
          document
            .querySelector(`[data-todo-id="${result.focusId}"]`)
            ?.scrollIntoView({ block: "nearest" })
        }
        return
      }

      if (isSelectedTodoCopyShortcut(event, shortcutPlatform)) {
        event.preventDefault()
        event.stopPropagation()
        void copySelectedTodos()
      }
    }

    window.addEventListener("keydown", handleSelectionShortcut, true)
    return () => window.removeEventListener("keydown", handleSelectionShortcut, true)
  }, [
    copySelectedTodos,
    selectedTodoIds,
    selectionAnchorId,
    selectionFocusId,
    visibleTodos,
  ])

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || selectedTodoIds.length === 0) return
      event.preventDefault()
      endSweep()
      clearSelection()
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [selectedTodoIds.length, clearSelection, endSweep])

  // Cmd/Ctrl+Shift+I hands focus to the Important list
  useEffect(() => {
    const handleFocusRequest = () => {
      const targetId =
        activeTodoId && visibleTodos.some((todo) => todo.id === activeTodoId)
          ? activeTodoId
          : visibleTodos[0]?.id
      if (!targetId) return
      setActiveTodoId(targetId)
      focusTodo(targetId, "end")
    }

    window.addEventListener(FOCUS_IMPORTANT_LIST_EVENT, handleFocusRequest)
    return () => window.removeEventListener(FOCUS_IMPORTANT_LIST_EVENT, handleFocusRequest)
  }, [activeTodoId, visibleTodos, focusTodo])

  if (allTodos.length === 0) {
    return (
      <div data-pane="important" className="px-5 py-12 text-center text-sm text-muted-foreground">
        Star a task to keep it here.
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visibleTodos.map((todo) => todo.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={listRef}
          data-pane="important"
          className="space-y-0 px-2 pb-8"
          onPointerDown={handleListPointerDown}
        >
          {visibleTodos.map((todo) => (
            <SortableTodoItem
              key={todo.id}
              todo={todo}
              depth={todo.depth}
              isActive={activeTodoId === todo.id}
              isSelected={effectiveSelectedIds.has(todo.id)}
              isParent={parentIds.has(todo.id)}
              isCollapsed={collapsedIds.has(todo.id)}
              onTextChange={updateTodoTextById}
              onToggle={toggleTodoById}
              onToggleCollapse={toggleCollapse}
              onKeyDown={handleKeyDown}
              onPasteTodo={() => false}
              onFocus={handleFocus}
              onSelect={handleSelectTodo}
              inputRef={setTodoRef}
              importanceState={todo.importanceState}
              onRemoveImportant={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
