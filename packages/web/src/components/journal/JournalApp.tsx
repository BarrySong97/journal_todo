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
import { ImportantTodoList } from "./ImportantTodoList"

interface JournalAppProps {
  isWide?: boolean
  narrowView?: "workspace" | "important"
  onNarrowViewChange?: (view: "workspace" | "important") => void
  splitRatio?: number
  onSplitRatioChange?: (ratio: number) => void
}

export function JournalApp({
  isWide = false,
  narrowView = "workspace",
  onNarrowViewChange = () => {},
  splitRatio = 50,
  onSplitRatioChange = () => {},
}: JournalAppProps) {
  const {
    rollOverTodosToToday,
  } = useJournal()

  const { isMove: rolloverIsMove, setIsMove: setRolloverIsMove } = useRolloverMode()
  const [isRolloverOpen, setIsRolloverOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastOpen, setToastOpen] = useState(false)
  const panesRef = useRef<HTMLDivElement | null>(null)

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
