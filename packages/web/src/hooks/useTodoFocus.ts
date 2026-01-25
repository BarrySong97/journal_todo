import { useRef, useCallback } from "react"

export function useTodoFocus() {
  const todoRefs = useRef<Record<string, HTMLInputElement>>({})

  const setTodoRef = useCallback((todoId: string, element: HTMLInputElement | null) => {
    if (element) {
      todoRefs.current[todoId] = element
    } else {
      delete todoRefs.current[todoId]
    }
  }, [])

  const focusTodo = useCallback((todoId: string, position?: "start" | "end") => {
    const input = todoRefs.current[todoId]
    if (input) {
      input.focus()
      if (position === "end") {
        input.setSelectionRange(input.value.length, input.value.length)
      } else if (position === "start") {
        input.setSelectionRange(0, 0)
      }
    }
  }, [])

  const getTodoRef = useCallback((todoId: string) => {
    return todoRefs.current[todoId]
  }, [])

  return {
    setTodoRef,
    focusTodo,
    getTodoRef,
  }
}