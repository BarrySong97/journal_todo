import { useCallback, type KeyboardEvent } from "react"
import type { TodoItem } from "@/lib/types/journal"

interface UseTodoKeyboardProps {
  todos: TodoItem[]
  activeTodoId: string | null
  focusTodo: (todoId: string, position?: "start" | "end") => void
  addTodo: (text?: string, afterTodoId?: string) => string
  deleteTodo: (todoId: string) => void
  moveTodo: (todoId: string, direction: "up" | "down") => void
  updateTodoLevel: (todoId: string, direction: "indent" | "outdent") => void
  setActiveTodoId: (todoId: string | null) => void
}

export function useTodoKeyboard({
  todos,
  activeTodoId,
  focusTodo,
  addTodo,
  deleteTodo,
  moveTodo,
  updateTodoLevel,
  setActiveTodoId,
}: UseTodoKeyboardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, todoId: string) => {
      const currentIndex = todos.findIndex((todo) => todo.id === todoId)

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          if (e.altKey && e.shiftKey) {
            // Alt+Shift+↑: Move todo position up
            moveTodo(todoId, "up")
          } else {
            // Regular ↑: Move focus to previous todo
            if (currentIndex > 0) {
              const prevTodo = todos[currentIndex - 1]
              setActiveTodoId(prevTodo.id)
              focusTodo(prevTodo.id)
            }
          }
          break

        case "ArrowDown":
          e.preventDefault()
          if (e.altKey && e.shiftKey) {
            // Alt+Shift+↓: Move todo position down
            moveTodo(todoId, "down")
          } else {
            // Regular ↓: Move focus to next todo
            if (currentIndex < todos.length - 1) {
              const nextTodo = todos[currentIndex + 1]
              setActiveTodoId(nextTodo.id)
              focusTodo(nextTodo.id)
            }
          }
          break

        case "Enter":
          e.preventDefault()
          // Create new todo below current one
          const newTodoId = addTodo("", todoId)
          setActiveTodoId(newTodoId)
          // Small delay to ensure the new todo is rendered before focusing
          setTimeout(() => focusTodo(newTodoId), 0)
          break

        case "Delete": {
          // Smart delete - only if at beginning of empty todo and there are multiple todos
          const input = e.target as HTMLInputElement
          const deleteIsEmpty = input.value.trim() === ""
          const deleteIsAtStart = input.selectionStart === 0

          if (deleteIsEmpty && deleteIsAtStart && todos.length > 1) {
            e.preventDefault()
            // Delete current todo and focus previous one
            if (currentIndex > 0) {
              const prevTodo = todos[currentIndex - 1]
              deleteTodo(todoId)
              setActiveTodoId(prevTodo.id)
              setTimeout(() => focusTodo(prevTodo.id, "end"), 0)
            } else if (todos.length > 1) {
              // If it's the first todo, delete it and focus the next one
              const nextTodo = todos[currentIndex + 1]
              deleteTodo(todoId)
              setActiveTodoId(nextTodo.id)
              setTimeout(() => focusTodo(nextTodo.id, "start"), 0)
            }
          }
          break
        }

        case "Backspace": {
          // Similar to Delete but when at beginning of todo
          const inputEl = e.target as HTMLInputElement
          const backspaceIsEmpty = inputEl.value.trim() === ""
          const backspaceIsAtStart = inputEl.selectionStart === 0

          if (backspaceIsEmpty && backspaceIsAtStart && currentIndex > 0 && todos.length > 1) {
            e.preventDefault()
            // Delete current todo and focus previous one at end
            const prevTodo = todos[currentIndex - 1]
            deleteTodo(todoId)
            setActiveTodoId(prevTodo.id)
            setTimeout(() => focusTodo(prevTodo.id, "end"), 0)
          }
          break
        }

        case "Tab":
          e.preventDefault()
          if (e.shiftKey) {
            // Shift + Tab: Outdent (move to parent level)
            updateTodoLevel(todoId, "outdent")
          } else {
            // Tab: Indent (make it a sub-todo)
            updateTodoLevel(todoId, "indent")
          }
          break

        default:
          // Other keys are handled by the input element
          break
      }
    },
    [todos, activeTodoId, focusTodo, addTodo, deleteTodo, moveTodo, updateTodoLevel, setActiveTodoId]
  )

  return { handleKeyDown }
}