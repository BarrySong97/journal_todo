"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { JournalEditor } from "./JournalEditor"
import { JournalFooter } from "./JournalFooter"
import {
  ScrollArea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  SimpleToast,
} from "@journal-todo/ui"
import { useJournal } from "@/hooks/useJournal"
import { useRolloverMode } from "@/hooks/useRolloverMode"
import { getTodoShortcutPlatform } from "@/lib/utils/multiSelectShortcuts"
import {
  FOCUS_IMPORTANT_LIST_EVENT,
  FOCUS_MAIN_LIST_EVENT,
  isPaneFocusToggleShortcut,
} from "@/lib/utils/paneShortcuts"
import { ImportantTodoList } from "./ImportantTodoList"
import { AllTodosList } from "./AllTodosList"
import {
  ALL_TODOS_PANE_MAX_WIDTH,
  ALL_TODOS_PANE_MIN_WIDTH,
  ALL_TODOS_PANE_WIDTH,
} from "@/lib/constants/layout"

interface JournalAppProps {
  isWide?: boolean
  isExtraWide?: boolean
  narrowView?: "workspace" | "important"
  onNarrowViewChange?: (view: "workspace" | "important") => void
  splitRatio?: number
  onSplitRatioChange?: (ratio: number) => void
  allTodosWidth?: number
  onAllTodosWidthChange?: (width: number) => void
}

export function JournalApp({
  isWide = false,
  isExtraWide = false,
  narrowView = "workspace",
  onNarrowViewChange = () => {},
  splitRatio = 50,
  onSplitRatioChange = () => {},
  allTodosWidth = ALL_TODOS_PANE_WIDTH,
  onAllTodosWidthChange = () => {},
}: JournalAppProps) {
  const {
    rollOverTodosToToday,
  } = useJournal()

  const { isMove: rolloverIsMove, setIsMove: setRolloverIsMove } = useRolloverMode()
  const [isRolloverOpen, setIsRolloverOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastOpen, setToastOpen] = useState(false)
  const panesRef = useRef<HTMLDivElement | null>(null)
  const outerPanesRef = useRef<HTMLDivElement | null>(null)

  const handleRollover = () => {
    const count = rollOverTodosToToday(rolloverIsMove ? "move" : "copy")
    const verb = rolloverIsMove ? "Moved" : "Copied"
    const message =
      count > 0
        ? `${verb} ${count} unfinished todo${count > 1 ? "s" : ""} to today.`
        : "No unfinished todos to roll over."
    setToastMessage(message)
    setToastOpen(true)
    setIsRolloverOpen(false)
  }

  useEffect(() => {
    if (!toastOpen) return
    const timer = window.setTimeout(() => {
      setToastOpen(false)
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [toastOpen])

  // Cmd/Ctrl+Shift+I toggles focus between the main list and the Important list
  useEffect(() => {
    const platform = getTodoShortcutPlatform()
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isPaneFocusToggleShortcut(event, platform)) return
      // Don't steal focus from dialogs (command palette, alerts, ...)
      if (document.activeElement?.closest('[role="dialog"]')) return
      event.preventDefault()

      const inImportant = isWide
        ? document.activeElement?.closest('[data-pane="important"]') != null
        : narrowView === "important"
      const targetEvent = inImportant ? FOCUS_MAIN_LIST_EVENT : FOCUS_IMPORTANT_LIST_EVENT
      if (!isWide) {
        onNarrowViewChange(inImportant ? "workspace" : "important")
      }
      // Let a narrow-mode view switch mount the target pane before focusing
      setTimeout(() => window.dispatchEvent(new CustomEvent(targetEvent)), 0)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isWide, narrowView, onNarrowViewChange])

  const setRatioFromClientX = (clientX: number) => {
    const rect = panesRef.current?.getBoundingClientRect()
    if (!rect) return
    const min = (362 / rect.width) * 100
    const max = 100 - min
    onSplitRatioChange(Math.max(min, Math.min(max, ((clientX - rect.left) / rect.width) * 100)))
  }

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setRatioFromClientX(event.clientX)
  }

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) setRatioFromClientX(event.clientX)
  }

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 5 : 1
    const width = panesRef.current?.getBoundingClientRect().width ?? 725
    const min = (362 / width) * 100
    const max = 100 - min
    if (event.key === "Home") {
      event.preventDefault()
      onSplitRatioChange(50)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      onSplitRatioChange(Math.max(min, splitRatio - amount))
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      onSplitRatioChange(Math.min(max, splitRatio + amount))
    }
  }

  const setAllTodosWidthFromClientX = (clientX: number) => {
    const rect = outerPanesRef.current?.getBoundingClientRect()
    if (!rect) return
    const maxByContainer = rect.width - 362 * 2
    const max = Math.min(ALL_TODOS_PANE_MAX_WIDTH, maxByContainer)
    const width = Math.max(ALL_TODOS_PANE_MIN_WIDTH, Math.min(max, rect.right - clientX))
    onAllTodosWidthChange(width)
  }

  const handleAllTodosResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setAllTodosWidthFromClientX(event.clientX)
  }

  const handleAllTodosResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) setAllTodosWidthFromClientX(event.clientX)
  }

  const handleAllTodosResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 40 : 8
    const rect = outerPanesRef.current?.getBoundingClientRect()
    const maxByContainer = (rect?.width ?? ALL_TODOS_PANE_MAX_WIDTH) - 362 * 2
    const max = Math.min(ALL_TODOS_PANE_MAX_WIDTH, maxByContainer)
    if (event.key === "Home") {
      event.preventDefault()
      onAllTodosWidthChange(ALL_TODOS_PANE_WIDTH)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      onAllTodosWidthChange(Math.min(max, allTodosWidth + amount))
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      onAllTodosWidthChange(Math.max(ALL_TODOS_PANE_MIN_WIDTH, allTodosWidth - amount))
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 ">
      {/* Header with rollover button */}


      <AlertDialog open={isRolloverOpen} onOpenChange={setIsRolloverOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll over unfinished todos</AlertDialogTitle>
            <AlertDialogDescription>
              {rolloverIsMove
                ? "Unfinished todos from previous dates will be moved to today and removed from their original dates."
                : "Unfinished todos from previous dates will be copied to today."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollover}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div ref={outerPanesRef} className="flex flex-1 min-h-0">
        <div ref={panesRef} className="flex flex-1 min-h-0">
          {(!isWide && narrowView === "important") ? (
            <ScrollArea className="flex-1 min-h-0">
              <ImportantTodoList />
            </ScrollArea>
          ) : (
            <>
              <ScrollArea
                className="min-h-0"
                style={{ width: isWide ? `${splitRatio}%` : "100%" }}
              >
                <div className="px-2 pb-8">
                  <JournalEditor />
                </div>
              </ScrollArea>
              {isWide && (
                <>
                  <div
                    role="separator"
                    aria-label="Resize Workspace and Important panes"
                    aria-orientation="vertical"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(splitRatio)}
                    tabIndex={0}
                    className="relative z-10 w-px shrink-0 cursor-col-resize bg-border outline-none after:absolute after:inset-y-0 after:-left-1.5 after:w-3 focus:bg-ring"
                    onPointerDown={handleResizeStart}
                    onPointerMove={handleResizeMove}
                    onDoubleClick={() => onSplitRatioChange(50)}
                    onKeyDown={handleResizeKeyDown}
                  />
                  <ScrollArea className="min-h-0 flex-1">
                    <ImportantTodoList />
                  </ScrollArea>
                </>
              )}
            </>
          )}
        </div>
        {isWide && isExtraWide && (
          <>
            <div
              role="separator"
              aria-label="Resize All Todos pane"
              aria-orientation="vertical"
              aria-valuemin={ALL_TODOS_PANE_MIN_WIDTH}
              aria-valuemax={ALL_TODOS_PANE_MAX_WIDTH}
              aria-valuenow={Math.round(allTodosWidth)}
              tabIndex={0}
              className="relative z-10 w-px shrink-0 cursor-col-resize bg-border outline-none after:absolute after:inset-y-0 after:-left-1.5 after:w-3 focus:bg-ring"
              onPointerDown={handleAllTodosResizeStart}
              onPointerMove={handleAllTodosResizeMove}
              onDoubleClick={() => onAllTodosWidthChange(ALL_TODOS_PANE_WIDTH)}
              onKeyDown={handleAllTodosResizeKeyDown}
            />
            <ScrollArea className="min-h-0 shrink-0" style={{ width: allTodosWidth }}>
              <AllTodosList />
            </ScrollArea>
          </>
        )}
      </div>

      <JournalFooter
        isRolloverOpen={isRolloverOpen}
        onOpenRollover={() => setIsRolloverOpen(true)}
        rolloverIsMove={rolloverIsMove}
        onRolloverModeChange={setRolloverIsMove}
        isWide={isWide}
        activeView={narrowView}
        onViewChange={onNarrowViewChange}
      />

      <SimpleToast open={toastOpen} message={toastMessage} />
    </div>
  )
}
