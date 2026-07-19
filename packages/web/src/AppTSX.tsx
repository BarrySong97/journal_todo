"use client"

import { useEffect, useState } from "react"
import { useRef } from "react"
import type { CSSProperties } from "react"
import { Toaster } from "@journal-todo/ui"
import { DateNavigation } from "./components/journal/DateNavigation"
import { JournalApp } from "./components/journal/JournalApp"
import { useJournal } from "./hooks/useJournal"
import { isMeaningfulTodo } from "./lib/utils/todoFilters"

interface AppTSXProps {
  onReady?: () => void
  initialTodos?: string[]
  seedStorageKey?: string
  forceSinglePane?: boolean
}

const DEFAULT_SEED_STORAGE_KEY = "journal-embedded-seeded-v1"

export function AppTSX({
  onReady,
  initialTodos = [],
  seedStorageKey = DEFAULT_SEED_STORAGE_KEY,
  forceSinglePane = false,
}: AppTSXProps) {
  const { goToToday, currentWorkspace, getCurrentPage, updateTodoText, addTodo } = useJournal()
  const seedAttemptedRef = useRef(false)
  const [isWide, setIsWide] = useState(() => typeof window !== "undefined" && window.innerWidth >= 725)
  const [narrowView, setNarrowView] = useState<"workspace" | "important">("workspace")
  const [splitRatio, setSplitRatio] = useState(() => {
    const stored = typeof window !== "undefined" ? Number(localStorage.getItem("journal-important-split-ratio")) : 50
    return Number.isFinite(stored) ? stored : 50
  })
  const wasWideRef = useRef(isWide)
  const effectiveIsWide = forceSinglePane ? false : isWide

  useEffect(() => {
    goToToday()
  }, [goToToday])

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth
      const nextWide = width >= 725
      if (wasWideRef.current && !nextWide) setNarrowView("workspace")
      wasWideRef.current = nextWide
      setIsWide(nextWide)
      if (nextWide) {
        const min = (362 / width) * 100
        setSplitRatio((current) => Math.max(min, Math.min(100 - min, current)))
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const updateSplitRatio = (ratio: number) => {
    setSplitRatio(ratio)
    localStorage.setItem("journal-important-split-ratio", String(ratio))
  }

  useEffect(() => {
    if (seedAttemptedRef.current) return
    if (initialTodos.length === 0) return

    const hasMeaningfulTodo =
      Object.values(currentWorkspace?.pages ?? {}).some((page) =>
        page.todos.some((todo) => isMeaningfulTodo(todo))
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
        {effectiveIsWide ? (
          <>
            <div className="flex h-full items-center" style={{ width: `${splitRatio}%` }}>
              <DateNavigation />
            </div>
            <div className="h-full w-px bg-border" />
            <div className="flex flex-1 items-center justify-center text-xs font-medium text-muted-foreground">
              Important
            </div>
          </>
        ) : narrowView === "workspace" ? (
          <DateNavigation />
        ) : (
          <div className="px-3 text-xs font-medium text-muted-foreground">Important</div>
        )}
      </header>
      <JournalApp
        isWide={effectiveIsWide}
        narrowView={narrowView}
        onNarrowViewChange={setNarrowView}
        splitRatio={splitRatio}
        onSplitRatioChange={updateSplitRatio}
      />
      <Toaster />
    </div>
  )
}

export default AppTSX
