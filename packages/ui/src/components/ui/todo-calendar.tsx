import * as React from "react"
import type { Locale } from "date-fns"
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"

export interface TodoCalendarProps {
  selectedDate: Date
  visibleMonth: Date
  onVisibleMonthChange: (month: Date) => void
  onSelectDate: (date: Date) => void
  incompleteCountByDateKey: Record<string, number>
  locale?: Locale
  className?: string
}

const getDateKey = (date: Date) => format(date, "yyyy-MM-dd")

export function TodoCalendar({
  selectedDate,
  visibleMonth,
  onVisibleMonthChange,
  onSelectDate,
  incompleteCountByDateKey,
  locale,
  className,
}: TodoCalendarProps) {
  const weekStart = startOfWeek(startOfMonth(visibleMonth), { locale })
  const weekEnd = endOfWeek(endOfMonth(visibleMonth), { locale })

  const days: Date[] = []
  for (let day = weekStart; day <= weekEnd; day = addDays(day, 1)) {
    days.push(day)
  }

  const weekdayHeaders = React.useMemo(() => {
    const start = startOfWeek(new Date(), { locale })
    return Array.from({ length: 7 }, (_, index) =>
      format(addDays(start, index), "EE", { locale })
    )
  }, [locale])

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onVisibleMonthChange(subMonths(visibleMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">{format(visibleMonth, "yyyy年 M月", { locale })}</div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onVisibleMonthChange(addMonths(visibleMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2">
        {weekdayHeaders.map((label) => (
          <div key={label} className="text-muted-foreground text-center text-xs">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate)
          const outside = !isSameMonth(day, visibleMonth)
          const today = isToday(day)
          const count = incompleteCountByDateKey[getDateKey(day)] ?? 0

          return (
            <Button
              key={day.toISOString()}
              type="button"
              variant="ghost"
              onClick={() => onSelectDate(day)}
              className={cn(
                "h-16 cursor-pointer flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center",
                selected &&
                  "bg-primary text-primary-foreground hover:!bg-primary/60 hover:!text-primary-foreground hover:ring-1 hover:ring-primary-foreground/50",
                !selected && outside && "text-muted-foreground/50",
                !selected && today && "ring-1 ring-border"
              )}
            >
              <span className="text-sm font-medium">{format(day, "d")}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] leading-none",
                    selected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
