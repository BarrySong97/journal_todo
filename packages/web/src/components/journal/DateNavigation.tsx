"use client"

import { Button } from "@/components/ui/button"
import { useJournal } from "@/hooks/useJournal"
import { cn } from "@/lib/utils"
import { getTodayKey, parseDateKey } from "@/lib/utils/dateUtils"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Calendar } from "../ui/calendar"

interface DateNavigationProps {
  className?: string
}

export function DateNavigation({ className }: DateNavigationProps) {
  const {
    goToNextDay,
    goToPreviousDay,
  } = useJournal()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { currentDateKey, setCurrentDate } = useJournal();
  const isToday = currentDateKey === getTodayKey();
  const currentDate = parseDateKey(currentDateKey);
  const formattedDate = format(currentDate, "M月d日", { locale: zhCN });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setIsCalendarOpen(false);
    }
  };
  return (
    <div className={cn("flex items-center ml-2 ", className)} >
      {/* Left side: Previous day */}
      <Button
        variant="ghost"
        size="sm"
        onClick={goToPreviousDay}
        className="text-muted-foreground hover:text-foreground hover:bg-accent px-2"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger
          className={cn(
            "h-7 px-2 hover:bg-accent text-sm rounded-md transition-colors",
            isToday ? "text-primary font-medium" : "text-muted-foreground"
          )}
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {formattedDate}
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
      {/* Right side: Next day */}
      <Button
        variant="ghost"
        size="sm"
        onClick={goToNextDay}
        className="text-muted-foreground hover:text-foreground hover:bg-accent px-2"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
