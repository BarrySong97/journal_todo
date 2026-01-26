"use client"

import { useEffect, useState } from "react"
import { JournalEditor } from "./JournalEditor"
import { JournalFooter } from "./JournalFooter"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Toast } from "@/components/ui/toast"
import { useJournal } from "@/hooks/useJournal"

export function JournalApp() {
  const {
    rollOverTodosToToday,
  } = useJournal()

  const [isRolloverOpen, setIsRolloverOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastOpen, setToastOpen] = useState(false)

  const handleRollover = () => {
    const movedCount = rollOverTodosToToday()
    const message =
      movedCount > 0
        ? `Moved ${movedCount} unfinished todo${movedCount > 1 ? "s" : ""} to today.`
        : "No unfinished todos to move."
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
            <AlertDialogTitle>流转未完成的 To-do</AlertDialogTitle>
            <AlertDialogDescription>
              这会把以前日期中未完成的 To-do 移动到今天。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollover}>确认</AlertDialogAction>
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
      />

      <Toast open={toastOpen} message={toastMessage} />
    </div>
  )
}
