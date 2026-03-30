"use client"

import { useEffect, useState } from "react"
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

export function JournalApp() {
  const {
    rollOverTodosToToday,
  } = useJournal()

  const { isMove: rolloverIsMove, setIsMove: setRolloverIsMove } = useRolloverMode()
  const [isRolloverOpen, setIsRolloverOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastOpen, setToastOpen] = useState(false)

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

      <ScrollArea className="flex-1 min-h-0">
        <div className=" px-2 pb-8">


          <JournalEditor />
        </div>
      </ScrollArea>

      <JournalFooter
        isRolloverOpen={isRolloverOpen}
        onOpenRollover={() => setIsRolloverOpen(true)}
        rolloverIsMove={rolloverIsMove}
        onRolloverModeChange={setRolloverIsMove}
      />

      <SimpleToast open={toastOpen} message={toastMessage} />
    </div>
  )
}
