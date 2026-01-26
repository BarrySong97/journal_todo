"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { TodoItem } from "./TodoItem"
import { useJournal } from "@/hooks/useJournal"
import { useTodoFocus } from "@/hooks/useTodoFocus"
import { useTodoKeyboard } from "@/hooks/useTodoKeyboard"

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("textarea, input, button, a"))
}

const getSelectionRect = (start: { x: number; y: number }, current: { x: number; y: number }) => {
  const left = Math.min(start.x, current.x)
  const top = Math.min(start.y, current.y)
  const right = Math.max(start.x, current.x)
  const bottom = Math.max(start.y, current.y)
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

export function TodoList() {
  const {
    currentPage,
    currentWorkspaceId,
    updateTodoText,
    toggleTodo,
    addTodo,
    deleteTodo,
    moveTodo,
    updateTodoLevel,
  } = useJournal()

  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([])
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { setTodoRef, focusTodo } = useTodoFocus()
  const dragMovedRef = useRef(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const prevWorkspaceIdRef = useRef<string | null>(null)
  const selectedTodoSet = useMemo(() => new Set(selectedTodoIds), [selectedTodoIds])

  const clearSelection = useCallback(() => {
    setSelectedTodoIds([])
  }, [])

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

      const ordered = currentPage.todos
        .filter((todo) => hits.has(todo.id))
        .map((todo) => todo.id)

      setSelectedTodoIds(ordered)
    },
    [currentPage.todos]
  )

  const copySelectedTodos = useCallback(() => {
    const texts = currentPage.todos
      .filter((todo) => selectedTodoSet.has(todo.id))
      .map((todo) => todo.text)
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
        // fallback below
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
  }, [currentPage.todos, selectedTodoSet])

  const { handleKeyDown } = useTodoKeyboard({
    todos: currentPage.todos,
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

  useEffect(() => {
    if (currentPage.todos.length > 0 && !activeTodoId) {
      const firstTodo = currentPage.todos[0]
      setTimeout(() => {
        setActiveTodoId(firstTodo.id)
        focusTodo(firstTodo.id)
      }, 0)
    }
  }, [currentPage.date, currentPage.todos, activeTodoId, focusTodo])

  useEffect(() => {
    const prevWorkspaceId = prevWorkspaceIdRef.current
    if (prevWorkspaceId === currentWorkspaceId) return
    prevWorkspaceIdRef.current = currentWorkspaceId

    if (currentPage.todos.length === 0) return
    const firstTodo = currentPage.todos[0]
    clearSelection()
    setActiveTodoId(firstTodo.id)
    setTimeout(() => {
      focusTodo(firstTodo.id)
    }, 0)
  }, [currentWorkspaceId, currentPage.todos, focusTodo, clearSelection])

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

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (isInteractiveTarget(event.target)) return

    clearSelection()
    dragMovedRef.current = false
    setDragStart({ x: event.clientX, y: event.clientY })
    setDragCurrent({ x: event.clientX, y: event.clientY })
    setIsDragging(true)
    event.preventDefault()
  }

  useEffect(() => {
    if (!isDragging || !dragStart) return

    document.body.style.userSelect = "none"

    const handleMove = (event: MouseEvent) => {
      const nextPoint = { x: event.clientX, y: event.clientY }
      const distance =
        Math.abs(nextPoint.x - dragStart.x) + Math.abs(nextPoint.y - dragStart.y)
      if (distance > 3) {
        dragMovedRef.current = true
      }

      setDragCurrent(nextPoint)

      if (dragMovedRef.current) {
        const rect = getSelectionRect(dragStart, nextPoint)
        updateSelectionFromRect(rect)
      }
    }

    const handleUp = () => {
      setIsDragging(false)
      setDragStart(null)
      setDragCurrent(null)
      document.body.style.userSelect = ""

      if (!dragMovedRef.current) {
        clearSelection()
      }
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)

    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
      document.body.style.userSelect = ""
    }
  }, [isDragging, dragStart, updateSelectionFromRect, clearSelection])

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

  const selectionRect = useMemo(() => {
    if (!dragStart || !dragCurrent || !isDragging) return null
    if (!dragMovedRef.current) return null
    return getSelectionRect(dragStart, dragCurrent)
  }, [dragStart, dragCurrent, isDragging])

  if (currentPage.todos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No todos for this day yet.</p>
      </div>
    )
  }

  return (
    <div ref={listRef} onMouseDown={handleMouseDown} className="space-y-1">
      {selectionRect && (
        <div
          className="fixed z-50 pointer-events-none rounded-sm border border-primary/60 bg-primary/15"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}
      {currentPage.todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isActive={activeTodoId === todo.id}
          isSelected={selectedTodoSet.has(todo.id)}
          onTextChange={handleTextChange}
          onToggle={handleToggle}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          inputRef={setTodoRef}
        />
      ))}
    </div>
  )
}
