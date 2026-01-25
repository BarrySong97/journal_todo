"use client"

import { useState, useEffect } from "react"
import { TodoItem } from "./TodoItem"
import { useJournal } from "@/hooks/useJournal"
import { useTodoFocus } from "@/hooks/useTodoFocus"
import { useTodoKeyboard } from "@/hooks/useTodoKeyboard"

export function TodoList() {
  const {
    currentPage,
    updateTodoText,
    toggleTodo,
    addTodo,
    deleteTodo,
    moveTodo,
    updateTodoLevel,
  } = useJournal()

  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const { setTodoRef, focusTodo } = useTodoFocus()

  const { handleKeyDown } = useTodoKeyboard({
    todos: currentPage.todos,
    activeTodoId,
    focusTodo,
    addTodo,
    deleteTodo,
    moveTodo,
    updateTodoLevel,
    setActiveTodoId,
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

  const handleTextChange = (todoId: string, text: string) => {
    updateTodoText(todoId, text)
  }

  const handleToggle = (todoId: string) => {
    toggleTodo(todoId)
  }

  const handleFocus = (todoId: string) => {
    setActiveTodoId(todoId)
  }

  if (currentPage.todos.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No todos for this day yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {currentPage.todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isActive={activeTodoId === todo.id}
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
