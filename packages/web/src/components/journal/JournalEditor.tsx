"use client"

import { useRef } from "react"
import { TodoList } from "./TodoList"

export function JournalEditor() {
  const todoListRef = useRef<HTMLDivElement | null>(null)

  return (
    <div className="w-full min-h-[calc(100vh-12rem)] relative">
      <TodoList ref={todoListRef} />
    </div>
  )
}
