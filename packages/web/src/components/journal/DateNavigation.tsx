"use client"

import {
  Button,
  cn,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  TodoCalendar,
} from "@journal-todo/ui"
import { useJournal } from "@/hooks/useJournal"
import { getTodayKey, parseDateKey } from "@/lib/utils/dateUtils"
import { countIncompleteMeaningfulTodos } from "@/lib/utils/todoFilters"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

interface DateNavigationProps {
  className?: string
}

export function DateNavigation({ className }: DateNavigationProps) {
  const {
    goToNextDay,
    goToPreviousDay,
    currentWorkspace,
    currentDateKey,
    setCurrentDate,
  } = useJournal()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Safely parse the date key, falling back to today if invalid
  const safeCurrentDateKey =
    currentDateKey &&
    typeof currentDateKey === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(currentDateKey)
      ? currentDateKey
      : getTodayKey()

  const isToday = safeCurrentDateKey === getTodayKey()
  const currentDate = parseDateKey(safeCurrentDateKey)
  const formattedDate = format(currentDate, "M月d日", { locale: zhCN })
  const [visibleMonth, setVisibleMonth] = useState(currentDate)

  useEffect(() => {
    setVisibleMonth(currentDate)
  }, [safeCurrentDateKey])

  const incompleteCountByDateKey = useMemo(() => {
    const counts: Record<string, number> = {}
    const pages = currentWorkspace?.pages ?? {}
    for (const [dateKey, page] of Object.entries(pages)) {
      counts[dateKey] = countIncompleteMeaningfulTodos(page.todos)
    }
    return counts
  }, [currentWorkspace])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date)
      setVisibleMonth(date)
      setIsCalendarOpen(false)
    }
  }
  return (
    <div className={cn("flex items-center ml-2 ", className)} data-tauri-no-drag-region>
      {/* Left side: Previous day */}
      <Button
        variant="ghost"
        size="sm"
        onClick={goToPreviousDay}
        className="text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/50 px-2"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Drawer open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DrawerTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-7 px-2 hover:bg-accent hover:text-foreground dark:hover:bg-accent/50 text-sm rounded-md transition-colors",
              isToday ? "text-primary font-medium" : "text-muted-foreground"
            )}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {formattedDate}
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>选择日期</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <TodoCalendar
              selectedDate={currentDate}
              visibleMonth={visibleMonth}
              onVisibleMonthChange={setVisibleMonth}
              onSelectDate={(date) => handleDateSelect(date)}
              incompleteCountByDateKey={incompleteCountByDateKey}
              locale={zhCN}
            />
          </div>
        </DrawerContent>
      </Drawer>
      {/* Right side: Next day */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentDate(new Date())}
        disabled={isToday}
        className="text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/50 px-2"
      >
        今天
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={goToNextDay}
        className="text-muted-foreground hover:text-foreground hover:bg-accent dark:hover:bg-accent/50 px-2"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
