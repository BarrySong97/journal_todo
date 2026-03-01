"use client"

import { useEffect } from "react"
import type { CSSProperties } from "react"
import { Toaster } from "@journal-todo/ui"
import { DateNavigation } from "./components/journal/DateNavigation"
import { JournalApp } from "./components/journal/JournalApp"
import { useJournal } from "./hooks/useJournal"

interface AppTSXProps {
  onReady?: () => void
}

export function AppTSX({ onReady }: AppTSXProps) {
  const { goToToday } = useJournal()

  useEffect(() => {
    goToToday()
  }, [goToToday])

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
