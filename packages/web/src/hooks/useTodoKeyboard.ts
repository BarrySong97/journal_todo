import { useCallback, type KeyboardEvent } from "react"
import type { TodoItem } from "@/lib/types/journal"

interface UseTodoKeyboardProps {
  todos: TodoItem[]
  activeTodoId: string | null
  focusTodo: (todoId: string, position?: "start" | "end") => void
  addTodo: (text?: string, afterTodoId?: string, dateKey?: string, level?: number) => string
  updateTodoText: (todoId: string, text: string) => void
  deleteTodo: (todoId: string) => void
  moveTodo: (todoId: string, direction: "up" | "down") => void
  updateTodoLevel: (todoId: string, direction: "indent" | "outdent") => void
  setActiveTodoId: (todoId: string | null) => void
  selectedTodoIds: string[]
  copySelectedTodos: () => void
}

export const splitTodoTextForEnter = (
  text: string,
  selectionStart: number,
  selectionEnd: number
): { before: string; after: string } | null => {
  const safeStart = Math.max(0, Math.min(selectionStart, text.length))
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, text.length))
  if (safeStart >= text.length) return null
  return {
    before: text.slice(0, safeStart),
    after: text.slice(safeEnd),
  }
}

export function useTodoKeyboard({
  todos,
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
}: UseTodoKeyboardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>, todoId: string) => {
      const currentIndex = todos.findIndex((todo) => todo.id === todoId)
      const mergeToPreviousSibling = (currentText: string) => {
        if (currentIndex <= 0) return false

        const currentTodo = todos[currentIndex]
        let prevSiblingIndex = -1

        for (let i = currentIndex - 1; i >= 0; i -= 1) {
          if (todos[i].level === currentTodo.level) {
            prevSiblingIndex = i
            break
          }
          if (todos[i].level < currentTodo.level) {
            break
          }
        }

        if (prevSiblingIndex === -1) return false

        const prevTodo = todos[prevSiblingIndex]
        const prevText = prevTodo.text ?? ""
        const cursorPosition = prevText.length
        const merged = prevText + currentText
        updateTodoText(prevTodo.id, merged)
        deleteTodo(todoId)
        setActiveTodoId(prevTodo.id)

        setTimeout(() => {
          const ref = document.querySelector(
            `[data-todo-id="${prevTodo.id}"] textarea`
          ) as HTMLTextAreaElement | null
          if (ref) {
            ref.focus()
            ref.setSelectionRange(cursorPosition, cursorPosition)
          }
        }, 0)

        return true
      }

      switch (e.key) {
        case "c": {
          if ((e.metaKey || e.ctrlKey) && selectedTodoIds.length > 0) {
            const input = e.target as HTMLTextAreaElement
            if (input.selectionStart !== input.selectionEnd) break
            e.preventDefault()
            copySelectedTodos()
          }
          break
        }
        case "ArrowUp":
          e.preventDefault()
          if (e.altKey && e.shiftKey) {
            if (e.repeat) break
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
            if (e.repeat) break
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

        case "Enter": {
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+Enter or Cmd+Enter: Toggle todo status
            e.preventDefault()
            const currentTodo = todos[currentIndex]
            if (currentTodo) {
              // Save cursor position
              const input = e.target as HTMLTextAreaElement
              const cursorStart = input.selectionStart
              const cursorEnd = input.selectionEnd
              
              // Use a callback to toggle after the current event
              setTimeout(() => {
                const toggleEvent = new CustomEvent("toggle-todo", {
                  detail: { todoId: currentTodo.id },
                })
                window.dispatchEvent(toggleEvent)
                
                // Restore cursor position after toggle
                setTimeout(() => {
                  input.focus()
                  input.setSelectionRange(cursorStart, cursorEnd)
                }, 0)
              }, 0)
            }
            break
          }
          // Regular Enter handling below
          e.preventDefault()
          // Create new todo after current subtree at same level
          if (currentIndex === -1) return
          const input = e.target as HTMLTextAreaElement
          const currentText = input.value
          const selectionStart = input.selectionStart ?? currentText.length
          const selectionEnd = input.selectionEnd ?? selectionStart
          const currentTodo = todos[currentIndex]
          let insertIndex = currentIndex

          for (let i = currentIndex + 1; i < todos.length; i += 1) {
            if (todos[i].level > currentTodo.level) {
              insertIndex = i
            } else {
              break
            }
          }

          const afterTodoId = todos[insertIndex]?.id ?? todoId
          let newTodoText = ""

          const splitResult = splitTodoTextForEnter(currentText, selectionStart, selectionEnd)
          if (splitResult) {
            if (splitResult.before !== currentText) {
              updateTodoText(todoId, splitResult.before)
            }
            newTodoText = splitResult.after
          }

          const newTodoId = addTodo(newTodoText, afterTodoId, undefined, currentTodo.level)
          setActiveTodoId(newTodoId)
          // Small delay to ensure the new todo is rendered before focusing
          setTimeout(
            () => focusTodo(newTodoId, newTodoText.length > 0 ? "start" : undefined),
            0
          )
          break
        }

        case "Delete": {
          const input = e.target as HTMLTextAreaElement
          const deleteIsAtStart = input.selectionStart === 0 && input.selectionEnd === 0
          const currentText = input.value

          // Delete at start with text: merge to previous sibling
          if (deleteIsAtStart && currentText.length > 0) {
            e.preventDefault()
            if (mergeToPreviousSibling(currentText)) return
          }

          // Smart delete - only if at beginning of empty todo and there are multiple todos
          const deleteIsEmpty = input.value.trim() === ""

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
          const inputEl = e.target as HTMLTextAreaElement
          const backspaceIsAtStart = inputEl.selectionStart === 0 && inputEl.selectionEnd === 0
          const currentText = inputEl.value

          if (backspaceIsAtStart && currentText.length > 0) {
            e.preventDefault()
            if (mergeToPreviousSibling(currentText)) return
          }

          const backspaceIsEmpty = inputEl.value.trim() === ""

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
          if (e.ctrlKey || e.metaKey) {
            break
          }
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
    [
      todos,
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
    ]
  )

  return { handleKeyDown }
}
