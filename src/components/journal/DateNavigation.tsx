"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Toast } from "@/components/ui/toast"
import { useJournal } from "@/hooks/useJournal"
import { formatDateForDisplay, parseDateKey, getTodayKey } from "@/lib/utils/dateUtils"
import { cn } from "@/lib/utils"

interface DateNavigationProps {
  className?: string
}

export function DateNavigation({ className }: DateNavigationProps) {
  const {
    currentDateKey,
    setCurrentDate,
    goToToday,
    goToNextDay,
    goToPreviousDay,
    rollOverTodosToToday,
  } = useJournal()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isRolloverOpen, setIsRolloverOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [toastOpen, setToastOpen] = useState(false)

  const currentDate = parseDateKey(currentDateKey)
  const isToday = currentDateKey === getTodayKey()

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date)
      setIsCalendarOpen(false)
    }
  }

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
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Date Display and Calendar Picker */}
      <div className="flex items-center gap-2">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !currentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="font-semibold">
                {formatDateForDisplay(currentDateKey)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousDay}
          title="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {!isToday && (
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          title="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <AlertDialog open={isRolloverOpen} onOpenChange={setIsRolloverOpen}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRolloverOpen(true)}
          >
            流转以前的 To-do 到今天
          </Button>
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
      </div>

      <Toast open={toastOpen} message={toastMessage} />
    </div>
  )
}
