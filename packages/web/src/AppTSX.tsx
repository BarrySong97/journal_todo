"use client"

import { useEffect } from "react"
import { useRef } from "react"
import type { CSSProperties } from "react"
import { Toaster } from "@journal-todo/ui"
import { DateNavigation } from "./components/journal/DateNavigation"
import { JournalApp } from "./components/journal/JournalApp"
import { useJournal } from "./hooks/useJournal"

interface AppTSXProps {
  onReady?: () => void
  initialTodos?: string[]
  seedStorageKey?: string
}

const DEFAULT_SEED_STORAGE_KEY = "journal-embedded-seeded-v1"

export function AppTSX({ onReady, initialTodos = [], seedStorageKey = DEFAULT_SEED_STORAGE_KEY }: AppTSXProps) {
  const { goToToday, currentWorkspace, getCurrentPage, updateTodoText, addTodo } = useJournal()
  const seedAttemptedRef = useRef(false)

  useEffect(() => {
    goToToday()
  }, [goToToday])

  useEffect(() => {
    if (seedAttemptedRef.current) return
    if (initialTodos.length === 0) return

    const hasMeaningfulTodo =
      Object.values(currentWorkspace?.pages ?? {}).some((page) =>
        page.todos.some((todo) => typeof todo.text === "string" && todo.text.trim().length > 0)
      )

    if (typeof window !== "undefined" && window.localStorage.getItem(seedStorageKey)) {
      seedAttemptedRef.current = true
      return
    }

    if (hasMeaningfulTodo) {
      window.localStorage.setItem(seedStorageKey, "1")
      seedAttemptedRef.current = true
      return
    }

    const todos = initialTodos.map((item) => item.trim()).filter((item) => item.length > 0)
    if (todos.length === 0) {
      window.localStorage.setItem(seedStorageKey, "1")
      seedAttemptedRef.current = true
      return
    }

    const currentPage = getCurrentPage()
    const firstTodo = currentPage.todos.find((todo) => (todo.text ?? "").trim().length === 0) ?? currentPage.todos[0]

    if (firstTodo) {
      updateTodoText(firstTodo.id, todos[0], currentPage.date)
    } else {
      addTodo(todos[0], undefined, currentPage.date)
    }

    for (let i = 1; i < todos.length; i += 1) {
      addTodo(todos[i], undefined, currentPage.date)
    }

    window.localStorage.setItem(seedStorageKey, "1")
    seedAttemptedRef.current = true
  }, [addTodo, currentWorkspace, getCurrentPage, initialTodos, seedStorageKey, updateTodoText])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      onReady?.()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [onReady])

  return (
    <div className="h-full overflow-hidden flex flex-col bg-background">
      <header className="flex items-center h-9" style={{ WebkitAppRegion: "no-drag" } as CSSProperties}>
        <DateNavigation />
      </header>
      <JournalApp />
      <Toaster />
    </div>
  )
}

export default AppTSX
